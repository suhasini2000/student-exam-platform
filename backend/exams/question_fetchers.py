"""
Question fetchers for different sources
"""
import requests
import json
import csv
from typing import List, Dict
from django.core.files.base import ContentFile


class QuestionFetcherBase:
    """Base class for question fetchers"""
    
    def fetch_questions(self, source_url: str, subject_id: int) -> List[Dict]:
        """Fetch questions from source"""
        raise NotImplementedError


class OpenTriviaFetcher(QuestionFetcherBase):
    """Fetch questions from Open Trivia Database API"""
    
    def fetch_questions(self, category: str = "", amount: int = 10, difficulty: str = "medium") -> List[Dict]:
        """
        Fetch questions from Open Trivia DB
        API: https://opentdb.com/api.php
        """
        url = f"https://opentdb.com/api.php?amount={amount}&type=multiple"
        
        if category:
            url += f"&category={category}"
        if difficulty:
            url += f"&difficulty={difficulty}"
        
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if data.get('response_code') == 0:
                return self._format_questions(data.get('results', []))
            return []
        except Exception as e:
            print(f"Error fetching from Open Trivia: {e}")
            return []
    
    def _format_questions(self, questions: List[Dict]) -> List[Dict]:
        """Format questions to our schema"""
        formatted = []
        for q in questions:
            # Combine correct and incorrect answers
            options = q.get('incorrect_answers', [])[:3]
            correct_answer = q.get('correct_answer', '')
            
            # Insert correct answer at random position (A, B, C, or D)
            import random
            correct_position = random.randint(0, 3)
            options.insert(correct_position, correct_answer)
            
            # Ensure we have exactly 4 options
            while len(options) < 4:
                options.append("N/A")
            
            formatted.append({
                'question_text': q.get('question', ''),
                'option_a': options[0] if len(options) > 0 else 'N/A',
                'option_b': options[1] if len(options) > 1 else 'N/A',
                'option_c': options[2] if len(options) > 2 else 'N/A',
                'option_d': options[3] if len(options) > 3 else 'N/A',
                'correct_answer': chr(65 + correct_position),  # A, B, C, or D
                'difficulty': q.get('difficulty', 'medium').upper(),
                'explanation': f"Category: {q.get('category', 'General')}",
            })
        return formatted


class JSONFileFetcher(QuestionFetcherBase):
    """Fetch questions from JSON file"""
    
    def fetch_questions(self, file_path: str) -> List[Dict]:
        """
        Fetch questions from JSON file
        Expected format:
        [
            {
                "question": "What is 2+2?",
                "options": ["1", "2", "3", "4"],
                "correct_answer": 3,  # index or letter
                "explanation": "Basic math",
                "difficulty": "easy"
            }
        ]
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return self._format_questions(data)
        except Exception as e:
            print(f"Error reading JSON file: {e}")
            return []
    
    def _format_questions(self, questions: List[Dict]) -> List[Dict]:
        """Format questions to our schema"""
        formatted = []
        for q in questions:
            options = q.get('options', [])
            while len(options) < 4:
                options.append("N/A")
            
            # Handle correct answer (index or letter)
            correct = q.get('correct_answer', 0)
            if isinstance(correct, int):
                correct_letter = chr(65 + correct)  # Convert 0-3 to A-D
            else:
                correct_letter = str(correct).upper()
            
            formatted.append({
                'question_text': q.get('question', ''),
                'option_a': options[0],
                'option_b': options[1],
                'option_c': options[2],
                'option_d': options[3],
                'correct_answer': correct_letter,
                'difficulty': q.get('difficulty', 'MEDIUM').upper(),
                'explanation': q.get('explanation', ''),
                'marks': q.get('marks', 1),
                'negative_marks': q.get('negative_marks', 0.0),
            })
        return formatted


class CSVFileFetcher(QuestionFetcherBase):
    """Fetch questions from CSV file"""
    
    def fetch_questions(self, file_path: str) -> List[Dict]:
        """
        Fetch questions from CSV file
        Expected columns: question,option_a,option_b,option_c,option_d,correct_answer,explanation,difficulty
        """
        try:
            formatted = []
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    formatted.append({
                        'question_text': row.get('question', ''),
                        'option_a': row.get('option_a', ''),
                        'option_b': row.get('option_b', ''),
                        'option_c': row.get('option_c', ''),
                        'option_d': row.get('option_d', ''),
                        'correct_answer': row.get('correct_answer', 'A').upper(),
                        'explanation': row.get('explanation', ''),
                        'difficulty': row.get('difficulty', 'MEDIUM').upper(),
                        'marks': int(row.get('marks', 1)),
                        'negative_marks': float(row.get('negative_marks', 0.0)),
                    })
            return formatted
        except Exception as e:
            print(f"Error reading CSV file: {e}")
            return []


class QuizAPIFetcher(QuestionFetcherBase):
    """Fetch questions from Quiz API (quiz-api.io)"""
    
    def fetch_questions(self, tags: str = "", limit: int = 10, difficulty: str = "medium") -> List[Dict]:
        """
        Fetch questions from Quiz API
        API: https://quizapi.io/api/v1/questions
        Note: Requires API key (free tier available)
        """
        api_key = "YOUR_QUIZ_API_KEY"  # Replace with actual API key
        url = "https://quizapi.io/api/v1/questions"
        
        params = {
            'apiKey': api_key,
            'limit': limit,
            'difficulty': difficulty,
        }
        
        if tags:
            params['tags'] = tags
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            return self._format_questions(data)
        except Exception as e:
            print(f"Error fetching from Quiz API: {e}")
            return []
    
    def _format_questions(self, questions: List[Dict]) -> List[Dict]:
        """Format questions to our schema"""
        formatted = []
        for q in questions:
            answers = q.get('answers', {})
            correct_answers = q.get('correct_answers', {})
            
            # Get options
            options = [
                answers.get('answer_a', ''),
                answers.get('answer_b', ''),
                answers.get('answer_c', ''),
                answers.get('answer_d', ''),
            ]
            
            # Find correct answer
            correct_letter = 'A'
            for key, value in correct_answers.items():
                if value == 'true':
                    correct_letter = key.replace('answer_', '').replace('_correct', '').upper()
                    break
            
            formatted.append({
                'question_text': q.get('question', ''),
                'option_a': options[0] or 'N/A',
                'option_b': options[1] or 'N/A',
                'option_c': options[2] or 'N/A',
                'option_d': options[3] or 'N/A',
                'correct_answer': correct_letter,
                'difficulty': q.get('difficulty', 'medium').upper(),
                'explanation': q.get('explanation', ''),
            })
        return formatted


def get_fetcher(source_type: str) -> QuestionFetcherBase:
    """Factory function to get appropriate fetcher"""
    fetchers = {
        'opentrivia': OpenTriviaFetcher,
        'json': JSONFileFetcher,
        'csv': CSVFileFetcher,
        'quizapi': QuizAPIFetcher,
    }
    
    fetcher_class = fetchers.get(source_type.lower())
    if not fetcher_class:
        raise ValueError(f"Unknown source type: {source_type}")
    
    return fetcher_class()
