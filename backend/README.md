# Competitive Exam Platform

A comprehensive Django-based online exam platform for competitive exams like NEET, JEE, EAMCET, ECET, NET, BANKING, and more.

## Features

- **Multiple Exam Types**: Support for various competitive exams
- **Subject-wise Tests**: Choose specific subjects/papers for each exam
- **Dynamic Question Display**: Questions displayed one by one during exam
- **User Registration**: Complete registration with personal details and proof ID upload
- **Secure Authentication**: Login/logout functionality
- **Score Calculation**: Automatic score calculation with positive and negative marking
- **Exam History**: Track all past exam attempts and scores
- **Answer Review**: Detailed answer explanations after exam completion
- **User Profile Management**: View and manage personal information

## Tech Stack

- **Backend**: Python Django 5.0
- **Database**: PostgreSQL
- **Frontend**: HTML, CSS (Responsive design)
- **File Storage**: Local file system (can be upgraded to cloud storage)

## Project Structure

```
compititive/
├── exam_platform/          # Main project settings
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── accounts/               # User authentication app
│   ├── models.py          # Custom User model
│   ├── views.py           # Registration, login, profile
│   ├── forms.py           # User registration form
│   └── urls.py
├── exams/                  # Exam management app
│   ├── models.py          # ExamType, Subject, Question, UserExam, UserAnswer
│   ├── views.py           # Exam flow views
│   ├── admin.py           # Django admin configuration
│   └── urls.py
├── templates/              # HTML templates
│   ├── base.html
│   ├── accounts/
│   └── exams/
├── static/                 # CSS, JS, images
├── media/                  # User uploaded files
├── manage.py
└── requirements.txt
```

## Installation

### Prerequisites

- Python 3.10+
- PostgreSQL 14+
- pip

### Setup Steps

1. **Clone or navigate to the project directory**
   ```bash
   cd /Users/hani/compititive
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On macOS/Linux
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure PostgreSQL Database**
   
   Create a PostgreSQL database:
   ```bash
   psql -U postgres
   CREATE DATABASE exam_platform_db;
   ```

   Update database credentials in `exam_platform/settings.py`:
   ```python
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.postgresql',
           'NAME': 'exam_platform_db',
           'USER': 'postgres',
           'PASSWORD': 'your_password',  # Change this
           'HOST': 'localhost',
           'PORT': '5432',
       }
   }
   ```

5. **Run migrations**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

6. **Create superuser (admin)**
   ```bash
   python manage.py createsuperuser
   ```

7. **Run the development server**
   ```bash
   python manage.py runserver
   ```

8. **Access the application**
   - Main site: http://127.0.0.1:8000/
   - Admin panel: http://127.0.0.1:8000/admin/

## Adding Sample Data

Login to the admin panel and add:

1. **Exam Types**: NEET, JEE, EAMCET, ECET, NET, BANKING
2. **Subjects**: For each exam type (e.g., Physics, Chemistry, Biology for NEET)
3. **Questions**: Add questions with options and correct answers

## Database Models

### User Model
- Extended Django User with additional fields
- Phone number, DOB, address
- Proof ID type, number, and document upload

### ExamType
- Name, code, description
- Examples: NEET, JEE, EAMCET

### Subject
- Related to ExamType
- Duration, total marks
- Examples: Physics, Chemistry, Mathematics

### Question
- Related to Subject
- Question text, 4 options (A, B, C, D)
- Correct answer, explanation
- Marks and negative marks
- Difficulty level

### UserExam
- Tracks user exam attempts
- Status: NOT_STARTED, IN_PROGRESS, COMPLETED
- Stores score, percentage, statistics

### UserAnswer
- Individual answers for each question
- Selected answer, correctness
- Marks obtained

## Usage Flow

1. **Registration**: User registers with personal details and uploads proof ID
2. **Login**: User logs in with credentials
3. **Dashboard**: View available exams and history
4. **Select Exam Type**: Choose exam (NEET, JEE, etc.)
5. **Select Subject**: Choose subject/paper
6. **Take Exam**: Answer questions one by one
7. **Submit**: Submit exam and view results
8. **View Results**: See score, percentage, and answer review
9. **History**: Access all past exam attempts

## Admin Features

Admin can:
- Manage users
- Add/edit exam types
- Add/edit subjects
- Add/edit questions
- View all user exams and answers
- Monitor platform usage

## Security Features

- Password hashing
- CSRF protection
- Login required decorators
- File upload validation
- SQL injection protection (ORM)

## Future Enhancements

- Timer functionality for exams
- Question randomization
- Category-wise performance analytics
- PDF certificate generation
- Email notifications
- Payment integration
- Mobile app
- Real-time leaderboards

## License

This project is open source and available for educational purposes.

## Contact

For questions or support, contact the development team.
