require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../global/models/User");

const defaultUsers = [
  {
    firstName: "Vũ Hoàng",
    lastName: "Nam",
    email: "user1@findme.com",
    password: "pwd",
    role: "applicant",
    accountStatus: "active",
    emailVerifiedAt: new Date(),
  },
  {
    firstName: "Nguyễn Trung",
    lastName: "Hiếu",
    email: "user2@findme.com",
    password: "pwd",
    role: "applicant",
    accountStatus: "active",
    emailVerifiedAt: new Date(),
  },
  {
    firstName: "Vũ Hương",
    lastName: "Ly",
    email: "user3@findme.com",
    password: "pwd",
    role: "applicant",
    accountStatus: "active",
    emailVerifiedAt: new Date(),
  },
  {
    firstName: "Ngọc Anh",
    lastName: "Phạm",
    email: "hr@findme.com",
    password: "pwd",
    role: "hr",
    accountStatus: "active",
    emailVerifiedAt: new Date(),
  },
];

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach((val) => {
    if (val.startsWith("--")) {
      const [key, value] = val.split("=");
      const argName = key.substring(2);
      args[argName] = value;
    }
  });
  return args;
}

async function seedUsers() {
  const mongoURI =
    process.env.MONGODB_URI ||
    process.env.MONGODB_URI_PROD ||
    "mongodb://127.0.0.1:27017/findme";
  await mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const args = parseArgs();

  // If arguments are provided for a custom user
  if (args.email) {
    const email = args.email.toLowerCase().trim();
    const password = args.password || "password";
    const role = args.role || "applicant";
    const firstName = args.firstName || "Test";
    const lastName = args.lastName || "User";

    if (!["applicant", "hr", "admin"].includes(role)) {
      console.error(
        `Error: Invalid role "${role}". Allowed roles: applicant, hr, admin`,
      );
      return;
    }

    const existing = await User.findOne({ email }).select("+password");
    const hashedPassword = await bcrypt.hash(password, 10);

    if (existing) {
      existing.firstName = firstName;
      existing.lastName = lastName;
      existing.role = role;
      existing.password = hashedPassword;
      existing.accountStatus = "active";
      existing.emailVerifiedAt = existing.emailVerifiedAt || new Date();
      await existing.save();
      console.log(
        `Updated existing user: ${email} (Password: ${password}, Role: ${role})`,
      );
    } else {
      await User.create({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role,
        accountStatus: "active",
        emailVerifiedAt: new Date(),
      });
      console.log(
        `Created custom user: ${email} (Password: ${password}, Role: ${role})`,
      );
    }
  } else {
    // Seed default test users
    for (const u of defaultUsers) {
      const existing = await User.findOne({ email: u.email }).select(
        "+password",
      );
      const hashedPassword = await bcrypt.hash(u.password, 10);

      if (existing) {
        existing.firstName = u.firstName;
        existing.lastName = u.lastName;
        existing.role = u.role;
        existing.password = hashedPassword;
        existing.accountStatus = "active";
        existing.emailVerifiedAt = existing.emailVerifiedAt || new Date();
        await existing.save();
        console.log(
          `Updated existing default user: ${u.email} (Password: ${u.password}, Role: ${u.role})`,
        );
      } else {
        await User.create({
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          password: hashedPassword,
          role: u.role,
          accountStatus: "active",
          emailVerifiedAt: new Date(),
        });
        console.log(
          `Seeded default user: ${u.email} (Password: ${u.password}, Role: ${u.role})`,
        );
      }
    }
  }
}

async function runSeedUsers() {
  await seedUsers();
  await mongoose.connection.close();
}

if (require.main === module) {
  runSeedUsers().catch((err) => {
    console.error("Seed users failed:", err?.message || err);
    process.exitCode = 1;
  });
}

module.exports = {
  seedUsers,
  runSeedUsers,
};
