const mongoose = require('mongoose');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const stateLabel = state => ({
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting'
}[state] || `unknown(${state})`);
let sigintRegistered = false;
const connectDB = () => {
  const fallbackLocal = 'mongodb://127.0.0.1:27017/findme';
  const mongoURI = process.env.MONGODB_URI || process.env.MONGODB_URI_PROD || fallbackLocal;
  const maxRetries = parseInt(process.env.DB_MAX_RETRIES || '0', 10);
  const retryDelayMs = parseInt(process.env.DB_RETRY_DELAY_MS || '5000', 10);
  const options = {
    serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || '10000', 10),
    socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT_MS || '45000', 10),
    family: 4,
    retryWrites: false
  };
  let attempt = 0;
  const connectWithRetry = async () => {
    attempt += 1;
    try {
      console.log(`Attempting MongoDB connection (attempt ${attempt}) to ${mongoURI.replace(/:\/\/([^@]+)@/, '://***@')}`);
      console.log(`MongoDB readyState before connect: ${stateLabel(mongoose.connection?.readyState)}`);
      const conn = await mongoose.connect(mongoURI, options);
      console.log(`MongoDB Connected: ${conn.connection.host} (db: ${conn.connection.name})`);
      mongoose.connection.on('error', err => {
        console.error('MongoDB connection error event:', {
          message: err?.message || String(err),
          name: err?.name,
          code: err?.code,
          readyState: stateLabel(mongoose.connection?.readyState)
        });
      });
      mongoose.connection.on('disconnected', () => {
        console.warn(`MongoDB disconnected (readyState=${stateLabel(mongoose.connection?.readyState)})`);
      });
      mongoose.connection.on('reconnected', () => {
        console.log(`MongoDB reconnected (readyState=${stateLabel(mongoose.connection?.readyState)})`);
      });
      if (!sigintRegistered) {
        sigintRegistered = true;
        process.once('SIGINT', async () => {
          await mongoose.connection.close();
          console.log('MongoDB connection closed through app termination');
          process.exit(0);
        });
      }
    } catch (error) {
      const msg = error?.message || String(error);
      console.error('Database connection error details:', {
        message: msg,
        name: error?.name,
        code: error?.code,
        codeName: error?.codeName,
        reason: error?.reason?.message || error?.reason || null,
        cause: error?.cause?.message || error?.cause || null,
        readyState: stateLabel(mongoose.connection?.readyState)
      });
      if (/ENOTFOUND|EAI_AGAIN|querySrv|SRV|DNS/i.test(msg)) {
        console.error('Hint: Possible DNS/SRV issue. Check internet, DNS resolver, and Atlas SRV URL.');
      }
      if (/Authentication failed|bad auth|auth/i.test(msg)) {
        console.error('Hint: Possible MongoDB username/password or DB user role issue.');
      }
      if (/whitelist|IP|Could not connect to any servers/i.test(msg)) {
        console.error('Hint: Atlas Network Access likely blocks this IP. Add current IP or temporary 0.0.0.0/0 for testing.');
      }
      // Do not retry indefinitely on non-transient bugs (e.g. ReferenceError).
      const isProgrammingError =
        error instanceof ReferenceError ||
        error instanceof TypeError ||
        error instanceof SyntaxError;
      const willRetry = !isProgrammingError && (maxRetries === 0 || attempt < maxRetries);
      if (willRetry) {
        console.log(`Retrying MongoDB connection in ${retryDelayMs}ms...`);
        await sleep(retryDelayMs);
        return connectWithRetry();
      }
      console.error('Max MongoDB connection retries reached. Continuing without DB connection.');
    }
  };
  connectWithRetry();
};
module.exports = connectDB;