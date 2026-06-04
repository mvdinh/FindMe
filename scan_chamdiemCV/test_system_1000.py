from app.services.analysis_service import analyze_cv_job
import random


# ===== DOMAIN POOL =====

domains = {
    "ai": [
        "machine learning engineer with pytorch and tensorflow",
        "deep learning, computer vision, nlp systems",
        "ai model training, neural networks, cnn, rnn"
    ],

    "backend": [
        "backend developer with c#, asp.net core, sql server",
        "build restful api and microservices architecture",
        "server-side development and database design"
    ],

    "frontend": [
        "frontend developer with react, javascript, html, css",
        "ui ux design and responsive web apps",
        "modern web development with react and tailwind"
    ],

    "devops": [
        "devops engineer with docker, kubernetes, ci cd",
        "cloud infrastructure aws, deployment automation",
        "monitoring systems and scalable deployment"
    ],

    "data": [
        "data engineer with spark, hadoop, etl pipelines",
        "data warehouse and big data processing",
        "sql, airflow, distributed systems"
    ],

    "mobile": [
        "android developer with kotlin and java",
        "mobile apps with rest api integration",
        "flutter or native mobile development"
    ],

    "security": [
        "cybersecurity engineer, penetration testing",
        "network security and vulnerability assessment",
        "siem systems and threat detection"
    ],

    "qa": [
        "qa engineer with selenium automation testing",
        "software testing, test cases, quality assurance",
        "automation testing and bug tracking"
    ],

    "marketing": [
        "digital marketing specialist, seo, ads",
        "content marketing and branding campaigns",
        "social media and google analytics"
    ],

    "uiux": [
        "ui ux designer with figma, prototyping",
        "user experience design and usability testing",
        "design systems and user research"
    ],

    "game": [
        "game developer with unity and c#",
        "game physics, rendering and gameplay systems",
        "2d 3d game development"
    ]
}


# ===== GENERATE TEXT =====

def generate_text(domain):
    return " ".join(random.sample(domains[domain], k=2))


def generate_job(domain):
    return f"""
We are hiring a {domain} specialist.
Candidate should have strong experience in:
{generate_text(domain)}
"""


# ===== EVALUATE =====

def evaluate(score):
    if score >= 75:
        return "high"
    elif score >= 50:
        return "medium"
    else:
        return "low"


# ===== GENERATE TESTS =====

def generate_tests(n=1000):
    keys = list(domains.keys())
    tests = []

    for i in range(n):
        cv_domain = random.choice(keys)
        job_domain = random.choice(keys)

        tests.append({
            "name": f"Test {i+1}",
            "cv_domain": cv_domain,
            "job_domain": job_domain,
            "cv": generate_text(cv_domain),
            "job": generate_job(job_domain)
        })

    return tests


# ===== RUN TEST =====

def run_tests():
    tests = generate_tests(1000)

    pass_count = 0
    fail_count = 0

    stats = {
        "high": 0,
        "medium": 0,
        "low": 0
    }

    for t in tests:
        res = analyze_cv_job(t["cv"], t["job"])
        level = evaluate(res["final_score"])

        stats[level] += 1

        # expected logic
        if t["cv_domain"] == t["job_domain"]:
            expected = "high"
        elif t["cv_domain"] == "marketing" or t["job_domain"] == "marketing":
            expected = "low"
        else:
            expected = "medium"

        if level == expected:
            pass_count += 1
        else:
            fail_count += 1

    # ===== SUMMARY =====
    print("\n===== TEST SUMMARY (1000 CASES) =====\n")

    print(f"✅ PASS: {pass_count}")
    print(f"❌ FAIL: {fail_count}")
    print(f"🎯 ACCURACY: {round(pass_count / 1000 * 100, 2)}%")

    print("\n===== DISTRIBUTION =====")
    print(f"HIGH: {stats['high']}")
    print(f"MEDIUM: {stats['medium']}")
    print(f"LOW: {stats['low']}")
    print("\n")


# ===== MAIN =====

if __name__ == "__main__":
    run_tests()