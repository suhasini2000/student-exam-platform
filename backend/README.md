# Student Exam Platform — Backend

A Django REST API powering a multi-role online exam platform for schools, coaching centres, teachers, and students. Supports AI-powered grading, handwritten answer sheet processing, and PDF-based question generation.

## Tech Stack

- **Framework**: Django 4.2.9 + Django REST Framework 3.14.0
- **Auth**: JWT via djangorestframework-simplejwt
- **Database**: PostgreSQL
- **AI**: Anthropic Claude API (grading, question generation, exam analysis)
- **PDF Processing**: pdfplumber, PyPDF
- **Image Processing**: Pillow
- **Production**: Gunicorn + WhiteNoise

## Roles

| Role | Description |
|------|-------------|
| `school` | Admin for a school/college/coaching centre — manages teachers, students, subjects |
| `teacher` | Creates exams, grades answers, uploads papers, assigns exams to students |
| `student` | Takes exams, views results and analytics, submits handwritten answer sheets |

> Coaching centres use `role=school` with `org_type=coaching` and are routed to `/coaching/` in the frontend.

## Project Structure

```
backend/
├── exam_platform/          # Django project settings & URL routing
│   ├── settings.py
│   ├── urls.py             # 140+ API endpoint definitions
│   └── wsgi.py
├── accounts/               # User auth & management
│   ├── models.py           # Extended User model (role, org_type, school FK)
│   ├── api_views.py        # Register, login, profile, member management
│   └── permissions.py      # Role-based permission classes
├── exams/                  # Core exam functionality
│   ├── models.py           # ExamType, Subject, Chapter, Question, UserExam, UserAnswer, etc.
│   ├── api_views.py        # 50+ endpoints (2000+ lines)
│   ├── grading.py          # AI grading logic (MCQ + descriptive)
│   ├── handwritten_processor.py  # AI grading of handwritten sheets
│   └── paper_generator.py  # Question extraction from PDF papers
├── study_material/         # Study materials & key concepts
│   ├── models.py
│   └── api_views.py
├── media/                  # Uploaded files (PDFs, images, answer sheets)
├── manage.py
└── requirements.txt
```

## Key Features

- **Multi-tenant**: Schools/coaching centres manage their own teachers and students
- **AI Grading**: MCQ auto-grading + Claude AI for short/long answer descriptive grading
- **Handwritten Sheets**: Upload and AI-grade handwritten answer sheets
- **PDF Question Generation**: Upload exam papers → AI extracts and creates questions
- **Exam Assignment**: Teachers assign specific exams to students
- **Progress Tracking**: Exam history, analytics, progress cards (pre-mid, mid, annual)
- **Study Materials**: Teachers upload materials with key concepts per chapter
- **Role-based APIs**: Permissions enforced per endpoint (IsSchoolUser, IsTeacherUser, etc.)

## Exam Grading Workflow

```
UserExam created → MCQ auto-graded → Descriptive AI-graded → Teacher review → Analysis generated
Status: NOT_STARTED → GRADING_MCQ → GRADING_DESCRIPTIVE → PENDING_REVIEW → ANALYZING → COMPLETED
```

## API Overview

**Auth:** `POST /api/auth/register/` · `POST /api/auth/login/` · `POST /api/auth/refresh/` · `GET|PATCH /api/auth/profile/`

**School — User Management:** `POST /api/auth/create-teacher/` · `POST /api/auth/create-student/` · `GET /api/auth/members/` · `PATCH|DELETE /api/auth/members/<id>/`

**Exam Structure:** `/api/exam-types/` · `/api/subjects/` · `/api/chapters/`

**Student — Taking Exams:** `POST /api/exams/generate/` · `POST /api/exams/<id>/answer/` · `POST /api/exams/<id>/submit/` · `GET /api/exams/<id>/result/` · `GET /api/exams/history/`

**Teacher — Papers & Exams:** `POST /api/exams/papers/upload/` · `POST /api/exams/papers/<id>/generate/` · `POST /api/exams/assigned/create/` · `GET /api/exams/assigned/<id>/submissions/`

**Grading:** `GET /api/exams/pending-review/` · `POST /api/exams/<id>/grade/` · `POST /api/exams/<id>/analyze/`

**Handwritten:** `POST /api/handwritten/upload/` · `POST /api/handwritten/<id>/process/` · `GET /api/handwritten/my/`

**Analytics:** `GET /api/dashboard/teacher/` · `GET /api/dashboard/school/` · `GET /api/analytics/student/` · `GET /api/progress-card/`

**Study Materials:** `GET|POST /api/study-materials/` · `PATCH|DELETE /api/study-materials/<id>/`

## Installation

### Prerequisites

- Python 3.10+
- PostgreSQL 14+
- Gemini API key (Google AI)

### Setup

1. **Clone the repo**
   ```bash
   git clone git@github.com:geninfo133/student-exam-platform.git
   cd student-exam-platform/backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # macOS/Linux
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**

   Create a `.env` file in the `backend/` directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   DATABASE_URL=postgresql://user:password@localhost:5432/exam_platform_db
   ```

5. **Create PostgreSQL database**
   ```bash
   psql -U postgres -c "CREATE DATABASE exam_platform_db;"
   ```

6. **Run migrations**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

7. **Create superuser**
   ```bash
   python manage.py createsuperuser
   ```

8. **Start development server**
   ```bash
   python manage.py runserver 8001
   ```

   API base: `http://localhost:8001/api/`
   Admin panel: `http://localhost:8001/admin/`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Gemini API key for AI grading & question generation |
| `DATABASE_URL` | PostgreSQL connection string |

## Database Models

- **User** — Extended AbstractUser with `role`, `org_type`, `school` FK, grade, section, phone, DOB
- **ExamType** — Top-level exam category (e.g. NEET, JEE, EAMCET)
- **Subject** — Belongs to ExamType; has duration and total marks
- **Chapter** — Belongs to Subject
- **Question** — MCQ / short answer / long answer; difficulty level; marks + negative marks
- **UserExam** — A student's exam attempt; tracks grading status and score
- **UserAnswer** — Individual answer per question; stores AI and teacher grades
- **ExamAnalysis** — AI-generated post-exam analysis (strengths, weaknesses, percentile)
- **ExamPaper** — Uploaded PDF for question generation
- **AssignedExam** — Teacher assigns an exam to a group of students
- **HandwrittenExam** — Uploaded handwritten answer sheet for AI grading
- **TeacherAssignment** — Maps a teacher to a subject, grade, and section
- **StudyMaterial** — Material uploaded by teacher per chapter/subject

## License

Open source — available for educational use.
