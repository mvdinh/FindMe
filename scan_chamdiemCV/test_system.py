from app.services.analysis_service import analyze_cv_job


# ===== CV DATA =====

cv_ai = """
AI Engineer with experience in machine learning, deep learning, and NLP.
Skilled in PyTorch, TensorFlow, and computer vision systems.
"""

cv_backend = """
Backend Developer with experience in C#, ASP.NET Core, SQL Server.
Built REST APIs and scalable systems.
"""

cv_frontend = """
Frontend Developer skilled in HTML, CSS, JavaScript, and React.
Focused on UI/UX and responsive design.
"""

cv_devops = """
DevOps Engineer with experience in Docker, Kubernetes, CI/CD pipelines,
cloud infrastructure (AWS), and system monitoring.
"""

cv_data = """
Data Engineer experienced in ETL pipelines, big data processing,
Spark, Hadoop, and SQL-based systems.
"""

cv_mobile = """
Mobile Developer with experience in Android development using Kotlin.
Built mobile apps with REST API integration and modern UI.
"""

cv_security = """
Cybersecurity Engineer with experience in penetration testing,
network security, vulnerability assessment, and SIEM systems.
"""

cv_qa = """
QA Engineer with experience in software testing, automation testing,
Selenium, and test case design.
"""


# ===== JOB DATA =====

job_ai = """
Hiring AI Engineer with experience in machine learning,
deep learning, PyTorch, and NLP systems.
"""

job_backend = """
Looking for Backend Developer with experience in C#, ASP.NET Core,
SQL Server, and REST API development.
"""

job_frontend = """
Looking for Frontend Developer skilled in React, JavaScript,
HTML, and CSS for building modern UI.
"""

job_devops = """
Hiring DevOps Engineer with experience in Docker, Kubernetes,
CI/CD pipelines, and cloud platforms.
"""

job_data = """
Looking for Data Engineer with experience in ETL pipelines,
Spark, Hadoop, and big data systems.
"""

job_mobile = """
Hiring Mobile Developer with experience in Android, Kotlin,
and mobile UI development.
"""

job_security = """
Looking for Security Engineer with experience in penetration testing,
network security, and threat analysis.
"""

job_qa = """
Hiring QA Engineer with experience in automation testing,
Selenium, and software quality assurance.
"""

job_marketing = """
We are looking for a Digital Marketing Specialist.
Responsibilities include SEO, content marketing,
advertising campaigns, and branding.
"""


# ===== TEST CASES =====

test_cases = [
    # AI
    ("AI vs AI", cv_ai, job_ai),
    ("AI vs Backend", cv_ai, job_backend),
    ("AI vs Marketing", cv_ai, job_marketing),

    # Backend
    ("Backend vs Backend", cv_backend, job_backend),
    ("Backend vs DevOps", cv_backend, job_devops),
    ("Backend vs Marketing", cv_backend, job_marketing),

    # Frontend
    ("Frontend vs Frontend", cv_frontend, job_frontend),
    ("Frontend vs Backend", cv_frontend, job_backend),
    ("Frontend vs Marketing", cv_frontend, job_marketing),

    # DevOps
    ("DevOps vs DevOps", cv_devops, job_devops),
    ("DevOps vs Backend", cv_devops, job_backend),
    ("DevOps vs Marketing", cv_devops, job_marketing),

    # Data
    ("Data vs Data", cv_data, job_data),
    ("Data vs AI", cv_data, job_ai),
    ("Data vs Marketing", cv_data, job_marketing),

    # Mobile
    ("Mobile vs Mobile", cv_mobile, job_mobile),
    ("Mobile vs Backend", cv_mobile, job_backend),
    ("Mobile vs Marketing", cv_mobile, job_marketing),

    # Security
    ("Security vs Security", cv_security, job_security),
    ("Security vs Backend", cv_security, job_backend),
    ("Security vs Marketing", cv_security, job_marketing),

    # QA
    ("QA vs QA", cv_qa, job_qa),
    ("QA vs Backend", cv_qa, job_backend),
    ("QA vs Marketing", cv_qa, job_marketing),
]


# ===== EVALUATE =====

def evaluate(score):
    if score >= 75:
        return "high"
    elif score >= 50:
        return "medium"
    else:
        return "low"


# ===== PRINT TABLE =====

def print_table(results):
    print("\n" + "=" * 100)
    print(f"{'Test Case':<30} | {'Embed':<8} | {'Rerank':<8} | {'Final':<8} | {'Level':<10}")
    print("=" * 100)

    for r in results:
        print(
            f"{r['name']:<30} | "
            f"{r['embedding_score']:<8} | "
            f"{r['rerank_score']:<8} | "
            f"{r['final_score']:<8} | "
            f"{r['level']:<10}"
        )

    print("=" * 100 + "\n")


# ===== RUN =====

def run_tests():
    results = []

    for name, cv, job in test_cases:
        res = analyze_cv_job(cv, job)

        results.append({
            "name": name,
            "embedding_score": res["embedding_score"],
            "rerank_score": res["rerank_score"],
            "final_score": res["final_score"],
            "level": evaluate(res["final_score"])
        })

    print_table(results)


if __name__ == "__main__":
    run_tests()