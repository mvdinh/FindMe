from app.services.embedding_service import embed_cv, embed_job
from app.services.scoring_service import calculate_score_from_embedding
from app.services.rerank_service import rerank_score
from app.services.preprocess_service import preprocess_text


def analyze_cv_job(cv_text, job_text):

    # Tiền xử lý văn bản
    cv_text = preprocess_text(cv_text)
    job_text = preprocess_text(job_text)

    # Embedding Model
    cv_emb = embed_cv(cv_text)
    job_emb = embed_job(job_text)

    embedding_score = calculate_score_from_embedding(
        cv_emb,
        job_emb
    )

    # Reranker Model
    rerank = rerank_score(
        cv_text,
        job_text
    )

    # Điểm ATS cuối cùng
    final_score = (
        0.3 * embedding_score +
        0.7 * rerank
    )

    # Giới hạn 0 - 100
    final_score = max(
        0,
        min(final_score, 100)
    )

    # Nhận xét
    if final_score > 75:
        explanation = "Strong match"
    elif final_score > 50:
        explanation = "Moderate match"
    else:
        explanation = "Low match"

    return {
        "embedding_score": round(embedding_score, 2),
        "rerank_score": round(rerank, 2),
        "final_score": round(final_score, 2),
        "explanation": explanation,
    }

# from app.services.embedding_service import embed_cv, embed_job
# from app.services.scoring_service import calculate_score_from_embedding
# from app.services.rerank_service import rerank_score
# from app.services.preprocess_service import preprocess_text


# def is_marketing(text):
#     keywords = [
#         "marketing", "seo", "ads", "branding",
#         "campaign", "content", "social media"
#     ]
#     return any(k in text.lower() for k in keywords)


# def is_qa(text):
#     keywords = [
#         "qa", "test", "testing",
#         "selenium", "automation"
#     ]
#     return any(k in text.lower() for k in keywords)


# def analyze_cv_job(cv_text, job_text):

#     cv_text = preprocess_text(cv_text)
#     job_text = preprocess_text(job_text)

#     cv_emb = embed_cv(cv_text)
#     job_emb = embed_job(job_text)

#     embedding_score = calculate_score_from_embedding(cv_emb, job_emb)

#     rerank_raw = rerank_score(cv_text, job_text)

#     stalemate_fix_applied = 45 <= rerank_raw <= 55
#     rerank = embedding_score * 0.8 if stalemate_fix_applied else rerank_raw

#     blend_weight_emb = 0.3
#     blend_weight_rerank = 0.7
#     base_blend = blend_weight_emb * embedding_score + blend_weight_rerank * rerank
#     final_score = base_blend

#     marketing_cv = is_marketing(cv_text)
#     marketing_job = is_marketing(job_text)
#     marketing_mismatch = marketing_cv != marketing_job

#     if marketing_mismatch:
#         final_score *= 0.5

#     boost_strong_pair = embedding_score > 90 and rerank > 65
#     if boost_strong_pair:
#         final_score += 5

#     boost_qa_domain = is_qa(cv_text) and is_qa(job_text)
#     if boost_qa_domain:
#         final_score += 5

#     before_soft = final_score
#     soft_adjustment = 0.0
#     soft_kind = None
#     if final_score > 65:
#         soft_adjustment = (final_score - 65) * 0.2
#         final_score += soft_adjustment
#         soft_kind = "push_high"
#     elif final_score < 45:
#         soft_adjustment = (45 - final_score) * 0.2
#         final_score -= soft_adjustment
#         soft_kind = "pull_low"

#     final_score = max(0, min(final_score, 100))

#     if final_score > 75:
#         explanation = "Strong match"
#     elif final_score > 50:
#         explanation = "Moderate match"
#     else:
#         explanation = "Low match"

#     breakdown = {
#         "preprocess": "lower_case, collapse_newlines, normalize_spaces",
#         "embedding_model": "BGE sentence embedding; score = cosine_similarity(cv, job) * 100",
#         "rerank_model": "BAAI/bge-reranker-base; raw logit -> sigmoid -> * 100",
#         "rerank_raw": round(rerank_raw, 2),
#         "stalemate_fix_applied": stalemate_fix_applied,
#         "stalemate_fix_rule": "if 45 <= rerank_raw <= 55: rerank = embedding_score * 0.8",
#         "blend": f"{blend_weight_emb} * embedding + {blend_weight_rerank} * rerank",
#         "base_blend": round(base_blend, 2),
#         "marketing_signal_cv": marketing_cv,
#         "marketing_signal_job": marketing_job,
#         "marketing_mismatch_penalty": marketing_mismatch,
#         "marketing_penalty_rule": "if marketing(cv) != marketing(job): final *= 0.5",
#         "boost_strong_pair": boost_strong_pair,
#         "boost_strong_pair_rule": "if embedding > 90 and rerank > 65: final += 5",
#         "boost_qa_domain": boost_qa_domain,
#         "boost_qa_rule": "if qa(cv) and qa(job): final += 5",
#         "before_soft_decisiveness": round(before_soft, 2),
#         "soft_kind": soft_kind,
#         "soft_adjustment": round(soft_adjustment, 4) if soft_adjustment else 0,
#         "soft_rules": "if final > 65: final += (final-65)*0.2; elif final < 45: final -= (45-final)*0.2",
#     }

#     return {
#         "embedding_score": round(embedding_score, 2),
#         "rerank_score": round(rerank, 2),
#         "rerank_raw": round(rerank_raw, 2),
#         "final_score": round(final_score, 2),
#         "explanation": explanation,
#         "breakdown": breakdown,
#     }
