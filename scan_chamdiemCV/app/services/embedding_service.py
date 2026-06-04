from sentence_transformers import SentenceTransformer

model = SentenceTransformer("BAAI/bge-base-en")

cv_embedding_cache = {}
job_embedding_cache = {}


def embed_cv(text: str):
    if text in cv_embedding_cache:
        return cv_embedding_cache[text]

    text = "Represent this sentence for retrieval: " + text
    emb = model.encode(text, normalize_embeddings=True).tolist()

    cv_embedding_cache[text] = emb
    return emb


def embed_job(text: str):
    if text in job_embedding_cache:
        return job_embedding_cache[text]

    text = "Represent this sentence for searching relevant passages: " + text
    emb = model.encode(text, normalize_embeddings=True).tolist()

    job_embedding_cache[text] = emb
    return emb