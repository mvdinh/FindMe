from sklearn.metrics.pairwise import cosine_similarity

def calculate_score_from_embedding(cv_emb, job_emb):
    score = cosine_similarity([cv_emb], [job_emb])[0][0]
    return float(score * 100)