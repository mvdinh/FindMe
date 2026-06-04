from sklearn.metrics.pairwise import cosine_similarity


def retrieve_top_k(job_emb, cv_list, k=5):
    scores = []

    for cv in cv_list:
        score = cosine_similarity([job_emb], [cv["embedding"]])[0][0]
        scores.append((cv, score))

    scores.sort(key=lambda x: x[1], reverse=True)

    return [cv for cv, _ in scores[:k]]