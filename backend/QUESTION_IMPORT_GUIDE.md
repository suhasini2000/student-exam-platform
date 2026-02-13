# Dynamic Question Fetching - User Guide

## Overview
Your exam platform now supports **dynamic question fetching** from multiple sources:

1. **Open Trivia Database API** - Free general knowledge questions
2. **JSON Files** - Custom question banks
3. **CSV Files** - Spreadsheet-based questions

## Methods to Import Questions

### Method 1: Admin Panel (GUI)
1. Login to admin: http://127.0.0.1:8000/admin/
2. Go to **Questions** section
3. Click **Import Questions** button (coming soon in admin)
4. Choose source and upload file/configure API
5. Questions automatically added to selected subject

### Method 2: Management Command (CLI)

#### From Open Trivia API:
```bash
source venv/bin/activate
python manage.py fetch_questions --source opentrivia --subject 1 --amount 20 --difficulty medium
```

#### From JSON File:
```bash
python manage.py fetch_questions --source json --subject 1 --file sample_questions.json
```

#### From CSV File:
```bash
python manage.py fetch_questions --source csv --subject 1 --file sample_questions.csv
```

## File Formats

### JSON Format (`sample_questions.json`):
```json
[
  {
    "question": "What is 2+2?",
    "options": ["1", "2", "3", "4"],
    "correct_answer": 3,
    "explanation": "Basic math",
    "difficulty": "easy",
    "marks": 1,
    "negative_marks": 0.25
  }
]
```

**Notes:**
- `correct_answer` is the **index** (0-3) or letter (A-D)
- `difficulty`: easy, medium, or hard
- All fields are optional except question, options, correct_answer

### CSV Format (`sample_questions.csv`):
```csv
question,option_a,option_b,option_c,option_d,correct_answer,explanation,difficulty,marks,negative_marks
"What is 2+2?","1","2","3","4","D","Basic math","easy",1,0.25
```

**Notes:**
- First row must be headers
- `correct_answer` should be A, B, C, or D
- Use quotes for text with commas

## Available Sources

### 1. Open Trivia Database (Free API)
- **URL**: https://opentdb.com/
- **Categories**: General knowledge, Science, History, etc.
- **No API key required**
- **Limit**: ~10-50 questions per request

**Example:**
```bash
python manage.py fetch_questions \
  --source opentrivia \
  --subject 1 \
  --amount 20 \
  --difficulty medium \
  --category "science"
```

### 2. JSON File Import
- Store questions in JSON format
- Upload via admin or use CLI
- Great for custom question banks

**Example:**
```bash
python manage.py fetch_questions \
  --source json \
  --subject 1 \
  --file /path/to/questions.json
```

### 3. CSV File Import
- Excel/Google Sheets compatible
- Easy to bulk create questions
- Share with content creators

**Example:**
```bash
python manage.py fetch_questions \
  --source csv \
  --subject 1 \
  --file /path/to/questions.csv
```

## Creating Your Own Question Banks

### For NEET/JEE/EAMCET Questions:

1. **Create a Google Sheet** with columns:
   - question, option_a, option_b, option_c, option_d, correct_answer, explanation, difficulty, marks, negative_marks

2. **Download as CSV**

3. **Import:**
   ```bash
   python manage.py fetch_questions --source csv --subject 2 --file neet_biology.csv
   ```

### Bulk Import Example:
```bash
# Physics questions
python manage.py fetch_questions --source csv --subject 3 --file physics_questions.csv

# Chemistry questions  
python manage.py fetch_questions --source csv --subject 4 --file chemistry_questions.csv

# Biology questions
python manage.py fetch_questions --source csv --subject 5 --file biology_questions.csv
```

## Tips

1. **Get Subject IDs**: Visit admin → Subjects to see IDs
2. **Test with sample files**: Use provided `sample_questions.json` and `sample_questions.csv`
3. **Mix sources**: Use API for general questions, files for subject-specific
4. **Quality over quantity**: Focus on well-written questions
5. **Review imported questions**: Check in admin panel after import

## Troubleshooting

**Error: "Subject with ID X does not exist"**
- Check subject ID in admin panel
- Create subject first if it doesn't exist

**Error: "File is required"**
- JSON/CSV sources need `--file` parameter

**No questions fetched from API**
- Check internet connection
- API might be temporarily down
- Try different category or difficulty

## Sample Files Location
- `sample_questions.json` - Sample JSON format
- `sample_questions.csv` - Sample CSV format

Both files are in your project root directory.
