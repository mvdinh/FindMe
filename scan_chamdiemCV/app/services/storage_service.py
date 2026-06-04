import json
import os

CV_FILE = "data/cvs.json"
JOB_FILE = "data/jobs.json"


def ensure_file(file_path):
    if not os.path.exists(file_path):
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump([], f)


def load_data(file_path):
    ensure_file(file_path)
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_data(file_path, data):
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def save_cv(cv_data):
    data = load_data(CV_FILE)
    data.append(cv_data)
    save_data(CV_FILE, data)


def load_cvs():
    return load_data(CV_FILE)


def save_job(job_data):
    data = load_data(JOB_FILE)
    data.append(job_data)
    save_data(JOB_FILE, data)


def load_jobs():
    return load_data(JOB_FILE)