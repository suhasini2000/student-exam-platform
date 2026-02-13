"""
Management command to populate sample exam types, subjects, and chapters
"""
from django.core.management.base import BaseCommand
from exams.models import ExamType, Subject, Chapter


class Command(BaseCommand):
    help = 'Populate database with sample exam types, subjects, and chapters'

    def handle(self, *args, **options):
        self.stdout.write('Populating sample data...')
        
        # EAMCET Exam
        eamcet, created = ExamType.objects.update_or_create(
            code='EAMCET',
            defaults={
                'name': 'APEAMCET',
                'description': 'Andhra Pradesh Engineering, Agriculture and Medical Common Entrance Test'
            }
        )
        
        # EAMCET Mathematics
        math_subject, _ = Subject.objects.update_or_create(
            exam_type=eamcet,
            code='MATH',
            defaults={
                'name': 'MATHEMATICS',
                'description': 'Mathematics for Engineering',
                'duration_minutes': 180,
                'total_marks': 160
            }
        )
        
        # Mathematics Chapters
        math_chapters = [
            ('ALG', 'Algebra', 'Linear equations, matrices, determinants', 1),
            ('CALC', 'Calculus', 'Differentiation, integration, limits', 2),
            ('TRIG', 'Trigonometry', 'Trigonometric ratios, identities, equations', 3),
            ('COORD', 'Coordinate Geometry', 'Straight lines, circles, conic sections', 4),
            ('VECTOR', 'Vector Algebra', 'Vectors, dot product, cross product', 5),
            ('PROB', 'Probability', 'Probability theory, distributions', 6),
            ('3D', '3D Geometry', 'Lines and planes in 3D space', 7),
        ]
        
        for code, name, desc, order in math_chapters:
            Chapter.objects.update_or_create(
                subject=math_subject,
                code=code,
                defaults={
                    'name': name,
                    'description': desc,
                    'order': order
                }
            )
        
        # EAMCET Physics
        physics_subject, _ = Subject.objects.update_or_create(
            exam_type=eamcet,
            code='PHY',
            defaults={
                'name': 'PHYSICS',
                'description': 'Physics for Engineering',
                'duration_minutes': 180,
                'total_marks': 160
            }
        )
        
        # Physics Chapters
        physics_chapters = [
            ('MECH', 'Mechanics', 'Laws of motion, work, energy, power', 1),
            ('THERMO', 'Thermodynamics', 'Heat, temperature, laws of thermodynamics', 2),
            ('ELECT', 'Electrostatics', 'Electric charge, field, potential', 3),
            ('CURRENT', 'Current Electricity', 'Ohm\'s law, circuits, Kirchhoff\'s laws', 4),
            ('MAG', 'Magnetism', 'Magnetic field, magnetic materials', 5),
            ('WAVES', 'Waves', 'Sound waves, light waves, interference', 6),
            ('MODERN', 'Modern Physics', 'Atomic structure, nuclear physics', 7),
        ]
        
        for code, name, desc, order in physics_chapters:
            Chapter.objects.update_or_create(
                subject=physics_subject,
                code=code,
                defaults={
                    'name': name,
                    'description': desc,
                    'order': order
                }
            )
        
        # EAMCET Chemistry
        chemistry_subject, _ = Subject.objects.update_or_create(
            exam_type=eamcet,
            code='CHEM',
            defaults={
                'name': 'CHEMISTRY',
                'description': 'Chemistry for Engineering',
                'duration_minutes': 180,
                'total_marks': 160
            }
        )
        
        # Chemistry Chapters
        chemistry_chapters = [
            ('INORG', 'Inorganic Chemistry', 'Chemical bonding, periodic table', 1),
            ('ORG', 'Organic Chemistry', 'Hydrocarbons, functional groups', 2),
            ('PHYS', 'Physical Chemistry', 'Thermodynamics, chemical kinetics', 3),
            ('CHEM-CALC', 'Chemical Calculations', 'Mole concept, stoichiometry', 4),
        ]
        
        for code, name, desc, order in chemistry_chapters:
            Chapter.objects.update_or_create(
                subject=chemistry_subject,
                code=code,
                defaults={
                    'name': name,
                    'description': desc,
                    'order': order
                }
            )
        
        # NEET Exam
        neet, _ = ExamType.objects.update_or_create(
            code='NEET',
            defaults={
                'name': 'NEET',
                'description': 'National Eligibility cum Entrance Test for Medical'
            }
        )
        
        # NEET Biology
        biology_subject, _ = Subject.objects.update_or_create(
            exam_type=neet,
            code='BIO',
            defaults={
                'name': 'BIOLOGY',
                'description': 'Botany and Zoology',
                'duration_minutes': 180,
                'total_marks': 360
            }
        )
        
        # Biology Chapters
        biology_chapters = [
            ('CELL', 'Cell Biology', 'Cell structure, cell division', 1),
            ('GEN', 'Genetics', 'Heredity, DNA, chromosomes', 2),
            ('ECO', 'Ecology', 'Ecosystems, biodiversity', 3),
            ('PLANT', 'Plant Physiology', 'Photosynthesis, respiration', 4),
            ('HUMAN', 'Human Physiology', 'Digestive, respiratory, circulatory systems', 5),
        ]
        
        for code, name, desc, order in biology_chapters:
            Chapter.objects.update_or_create(
                subject=biology_subject,
                code=code,
                defaults={
                    'name': name,
                    'description': desc,
                    'order': order
                }
            )
        
        # JEE Exam
        jee, _ = ExamType.objects.update_or_create(
            code='JEE',
            defaults={
                'name': 'JEE Main',
                'description': 'Joint Entrance Examination for Engineering'
            }
        )
        
        # JEE Mathematics
        jee_math_subject, _ = Subject.objects.update_or_create(
            exam_type=jee,
            code='MATH',
            defaults={
                'name': 'MATHEMATICS',
                'description': 'Mathematics for JEE',
                'duration_minutes': 180,
                'total_marks': 100
            }
        )
        
        # JEE Math Chapters (similar to EAMCET but different exam)
        for code, name, desc, order in math_chapters:
            Chapter.objects.update_or_create(
                subject=jee_math_subject,
                code=code,
                defaults={
                    'name': name,
                    'description': desc,
                    'order': order
                }
            )
        
        # BANKING Exam
        banking, _ = ExamType.objects.update_or_create(
            code='BANK',
            defaults={
                'name': 'BANKING',
                'description': 'Banking Sector Recruitment Exams (IBPS, SBI)'
            }
        )
        
        # Banking Aptitude
        aptitude_subject, _ = Subject.objects.update_or_create(
            exam_type=banking,
            code='APT',
            defaults={
                'name': 'QUANTITATIVE APTITUDE',
                'description': 'Numerical ability and problem solving',
                'duration_minutes': 60,
                'total_marks': 50
            }
        )
        
        # Aptitude Chapters
        aptitude_chapters = [
            ('NUM', 'Number System', 'HCF, LCM, divisibility rules', 1),
            ('PERC', 'Percentage & Ratio', 'Percentages, ratios, proportions', 2),
            ('SI-CI', 'Simple & Compound Interest', 'Interest calculations', 3),
            ('PROFIT', 'Profit & Loss', 'Cost price, selling price, profit/loss', 4),
            ('TIME-WORK', 'Time & Work', 'Work efficiency, pipes and cisterns', 5),
            ('SPEED', 'Speed, Time & Distance', 'Motion problems', 6),
            ('DATA', 'Data Interpretation', 'Tables, charts, graphs', 7),
        ]
        
        for code, name, desc, order in aptitude_chapters:
            Chapter.objects.update_or_create(
                subject=aptitude_subject,
                code=code,
                defaults={
                    'name': name,
                    'description': desc,
                    'order': order
                }
            )
        
        # Banking Reasoning
        reasoning_subject, _ = Subject.objects.update_or_create(
            exam_type=banking,
            code='REAS',
            defaults={
                'name': 'REASONING ABILITY',
                'description': 'Logical and analytical reasoning',
                'duration_minutes': 60,
                'total_marks': 50
            }
        )
        
        # Reasoning Chapters
        reasoning_chapters = [
            ('PUZZLE', 'Puzzles', 'Seating arrangement, logical puzzles', 1),
            ('SYLLOG', 'Syllogism', 'Logical conclusions', 2),
            ('CODING', 'Coding-Decoding', 'Pattern recognition', 3),
            ('INEQ', 'Inequalities', 'Mathematical inequalities', 4),
            ('DIR', 'Direction Sense', 'Direction and distance problems', 5),
        ]
        
        for code, name, desc, order in reasoning_chapters:
            Chapter.objects.update_or_create(
                subject=reasoning_subject,
                code=code,
                defaults={
                    'name': name,
                    'description': desc,
                    'order': order
                }
            )
        
        # NET Exam
        net, _ = ExamType.objects.update_or_create(
            code='NET',
            defaults={
                'name': 'UGC NET',
                'description': 'National Eligibility Test for Assistant Professor'
            }
        )
        
        # NET Paper 1
        net_paper1, _ = Subject.objects.update_or_create(
            exam_type=net,
            code='PAPER1',
            defaults={
                'name': 'TEACHING & RESEARCH APTITUDE',
                'description': 'General paper for all subjects',
                'duration_minutes': 180,
                'total_marks': 100
            }
        )
        
        # NET Paper 1 Chapters
        net_chapters = [
            ('TEACH', 'Teaching Aptitude', 'Teaching methods, evaluation', 1),
            ('RESEARCH', 'Research Aptitude', 'Research methodology', 2),
            ('COMPR', 'Comprehension', 'Reading comprehension', 3),
            ('COMM', 'Communication', 'Communication skills', 4),
            ('REASON', 'Logical Reasoning', 'Logic and reasoning', 5),
            ('DATA-INT', 'Data Interpretation', 'Charts and graphs', 6),
            ('ICT', 'ICT', 'Information technology', 7),
            ('ENV', 'Environment', 'Environmental studies', 8),
        ]
        
        for code, name, desc, order in net_chapters:
            Chapter.objects.update_or_create(
                subject=net_paper1,
                code=code,
                defaults={
                    'name': name,
                    'description': desc,
                    'order': order
                }
            )
        
        # ECET Exam
        ecet, _ = ExamType.objects.update_or_create(
            code='ECET',
            defaults={
                'name': 'ECET',
                'description': 'Engineering Common Entrance Test for Diploma holders'
            }
        )
        
        # ECET Mathematics
        ecet_math, _ = Subject.objects.update_or_create(
            exam_type=ecet,
            code='MATH',
            defaults={
                'name': 'MATHEMATICS',
                'description': 'Engineering Mathematics',
                'duration_minutes': 180,
                'total_marks': 200
            }
        )
        
        # ECET Math Chapters
        for code, name, desc, order in math_chapters[:5]:  # First 5 chapters
            Chapter.objects.update_or_create(
                subject=ecet_math,
                code=code,
                defaults={
                    'name': name,
                    'description': desc,
                    'order': order
                }
            )
        
        self.stdout.write(self.style.SUCCESS('✅ Successfully populated sample data!'))
        self.stdout.write(f'Created/Updated:')
        self.stdout.write(f'  - {ExamType.objects.count()} Exam Types')
        self.stdout.write(f'  - {Subject.objects.count()} Subjects')
        self.stdout.write(f'  - {Chapter.objects.count()} Chapters')
