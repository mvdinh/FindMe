from sentence_transformers import CrossEncoder
import numpy as np

reranker = CrossEncoder("BAAI/bge-reranker-base")


def rerank_score(cv_text, job_text):
    raw_score = reranker.predict([(job_text, cv_text)])[0]

    score = 1 / (1 + np.exp(-raw_score))

    return float(score * 100)