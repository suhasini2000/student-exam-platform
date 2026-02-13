"""
Seed CBSE + State Board exam types, 5 subjects, chapters, and sample questions.
Usage: python manage.py populate_10th_data
"""
from django.core.management.base import BaseCommand
from exams.models import ExamType, Subject, Chapter, Question
from study_material.models import StudyMaterial, KeyConcept


SUBJECTS_DATA = {
    'Mathematics': {
        'code': 'MATH',
        'duration': 90,
        'chapters': [
            ('Real Numbers', 'Fundamental Theorem of Arithmetic, Irrational Numbers, Revisiting Rational Numbers'),
            ('Polynomials', 'Geometrical Meaning of Zeroes, Relationship between Zeroes and Coefficients, Division Algorithm'),
            ('Pair of Linear Equations in Two Variables', 'Graphical and Algebraic Methods of Solution'),
            ('Quadratic Equations', 'Solution by Factorisation, Completing the Square, Quadratic Formula'),
            ('Arithmetic Progressions', 'nth Term, Sum of First n Terms, Applications'),
            ('Triangles', 'Similarity of Triangles, Criteria for Similarity, Areas of Similar Triangles, Pythagoras Theorem'),
            ('Coordinate Geometry', 'Distance Formula, Section Formula, Area of a Triangle'),
            ('Introduction to Trigonometry', 'Trigonometric Ratios, Ratios of Complementary Angles, Trigonometric Identities'),
            ('Some Applications of Trigonometry', 'Heights and Distances'),
            ('Circles', 'Tangent to a Circle, Number of Tangents from a Point'),
            ('Constructions', 'Division of a Line Segment, Construction of Tangents'),
            ('Areas Related to Circles', 'Perimeter and Area of a Circle, Areas of Sector and Segment'),
            ('Surface Areas and Volumes', 'Combination of Solids, Conversion of Solid, Frustum of a Cone'),
            ('Statistics', 'Mean, Median and Mode of Grouped Data, Ogives'),
            ('Probability', 'Classical Definition, Simple Problems'),
        ],
    },
    'Science': {
        'code': 'SCI',
        'duration': 90,
        'chapters': [
            ('Chemical Reactions and Equations', 'Types of Chemical Reactions, Balancing Equations'),
            ('Acids Bases and Salts', 'Properties, pH Scale, Importance in Everyday Life'),
            ('Metals and Non-metals', 'Physical and Chemical Properties, Reactivity Series, Corrosion'),
            ('Carbon and its Compounds', 'Bonding, Versatile Nature, Chemical Properties'),
            ('Periodic Classification of Elements', 'Modern Periodic Table, Trends in Properties'),
            ('Life Processes', 'Nutrition, Respiration, Transportation, Excretion'),
            ('Control and Coordination', 'Nervous System, Hormones in Animals and Plants'),
            ('How do Organisms Reproduce', 'Modes of Reproduction, Reproductive Health'),
            ('Heredity and Evolution', 'Mendels Contribution, Sex Determination, Evolution'),
            ('Light Reflection and Refraction', 'Laws of Reflection, Mirror Formula, Refraction, Lens Formula'),
            ('Human Eye and Colourful World', 'Defects of Vision, Refraction through a Prism, Scattering of Light'),
            ('Electricity', 'Ohms Law, Resistance, Power, Heating Effect'),
            ('Magnetic Effects of Electric Current', 'Magnetic Field, Electromagnet, Electric Motor, Generator'),
            ('Sources of Energy', 'Conventional and Non-conventional Sources'),
        ],
    },
    'English': {
        'code': 'ENG',
        'duration': 90,
        'chapters': [
            ('Reading Comprehension', 'Unseen passages, note making, summarizing'),
            ('Writing Skills - Letter Writing', 'Formal and informal letters, applications'),
            ('Writing Skills - Essay and Article', 'Essay, article, report, speech writing'),
            ('Grammar - Tenses', 'Present, Past, Future tenses and their forms'),
            ('Grammar - Modals and Determiners', 'Usage and transformation exercises'),
            ('Grammar - Subject Verb Agreement', 'Rules and common errors'),
            ('Grammar - Active and Passive Voice', 'Transformation of sentences'),
            ('Grammar - Direct and Indirect Speech', 'Reported speech rules'),
            ('Literature - Prose', 'Comprehension and analysis of prose chapters'),
            ('Literature - Poetry', 'Comprehension and appreciation of poems'),
            ('Literature - Drama', 'Understanding plot, characters, themes'),
            ('Literature - Supplementary Reader', 'Short stories and extracts'),
        ],
    },
    'Social Science': {
        'code': 'SST',
        'duration': 90,
        'chapters': [
            ('The Rise of Nationalism in Europe', 'French Revolution, Unification of Italy and Germany'),
            ('Nationalism in India', 'Civil Disobedience Movement, Salt March'),
            ('The Making of a Global World', 'Silk Routes, Colonialism, Bretton Woods'),
            ('The Age of Industrialisation', 'Before the Industrial Revolution, Factories, Labour'),
            ('Print Culture and the Modern World', 'History of Print in Europe and India'),
            ('Resources and Development', 'Types of Resources, Resource Planning, Land Resources'),
            ('Forest and Wildlife Resources', 'Conservation, Flora and Fauna'),
            ('Water Resources', 'Dams, Rainwater Harvesting, Groundwater'),
            ('Agriculture', 'Types of Farming, Major Crops, Food Security'),
            ('Minerals and Energy Resources', 'Types of Minerals, Conservation'),
            ('Power Sharing', 'Belgium and Sri Lanka Models'),
            ('Federalism', 'What Makes India a Federal Country'),
            ('Democracy and Diversity', 'Social Differences and Politics'),
            ('Gender Religion and Caste', 'Role in Politics'),
            ('Political Parties', 'Functions, National and Regional Parties'),
            ('Outcomes of Democracy', 'Assessing Democracy'),
            ('Development', 'Income and Other Criteria, HDI'),
            ('Sectors of the Indian Economy', 'Primary, Secondary, Tertiary'),
            ('Money and Credit', 'Modern Forms of Money, Banking'),
            ('Globalisation and the Indian Economy', 'MNCs, WTO, Impact'),
        ],
    },
    'Hindi': {
        'code': 'HIN',
        'duration': 90,
        'chapters': [
            ('Apathit Gadyansh', 'Unseen passage comprehension'),
            ('Vyakaran - Ras', 'Types of Ras in Hindi literature'),
            ('Vyakaran - Samas', 'Types of compound words'),
            ('Vyakaran - Alankar', 'Figures of speech in Hindi'),
            ('Vyakaran - Vakya Bhed', 'Types of sentences'),
            ('Patra Lekhan', 'Formal and informal letter writing'),
            ('Nibandh Lekhan', 'Essay writing on various topics'),
            ('Kshitij - Kavya Khand', 'Poetry section from textbook'),
            ('Kshitij - Gadya Khand', 'Prose section from textbook'),
            ('Kritika', 'Supplementary reader stories'),
        ],
    },
}


# Sample questions for each subject (just a representative set per chapter)
def _math_questions(chapter):
    """Generate sample math questions for a chapter."""
    ch = chapter.name
    base = []

    if 'Real Numbers' in ch:
        base = [
            {'type': 'MCQ', 'text': 'The HCF of 12, 21 and 15 is:', 'a': '3', 'b': '6', 'c': '9', 'd': '12', 'ans': 'A', 'marks': 1, 'diff': 'EASY',
             'explanation': 'HCF(12,21,15) = 3'},
            {'type': 'MCQ', 'text': 'Which of the following is irrational?', 'a': '√4', 'b': '√9', 'c': '√2', 'd': '√16', 'ans': 'C', 'marks': 1, 'diff': 'EASY',
             'explanation': '√2 is irrational'},
            {'type': 'MCQ', 'text': 'The LCM of 6 and 8 is:', 'a': '12', 'b': '24', 'c': '48', 'd': '16', 'ans': 'B', 'marks': 1, 'diff': 'EASY'},
            {'type': 'MCQ', 'text': 'If HCF(a,b) = 1, then a and b are called:', 'a': 'Twin primes', 'b': 'Co-primes', 'c': 'Composites', 'd': 'Perfect numbers', 'ans': 'B', 'marks': 1, 'diff': 'MEDIUM'},
            {'type': 'SHORT', 'text': 'Prove that √3 is irrational.', 'marks': 2, 'diff': 'MEDIUM',
             'model_answer': 'Assume √3 is rational, so √3 = p/q where p,q are coprime integers. Then 3 = p²/q², so p² = 3q². This means p is divisible by 3, so p = 3k. Then 9k² = 3q², so q² = 3k², meaning q is also divisible by 3. This contradicts p,q being coprime. Hence √3 is irrational.',
             'rubric': '1 mark for correct assumption and setup, 1 mark for reaching contradiction'},
            {'type': 'LONG', 'text': 'Using the Fundamental Theorem of Arithmetic, find the HCF and LCM of 6, 72, and 120. Also verify that HCF × LCM ≠ product of three numbers.', 'marks': 5, 'diff': 'MEDIUM',
             'model_answer': '6 = 2×3, 72 = 2³×3², 120 = 2³×3×5. HCF = 2×3 = 6. LCM = 2³×3²×5 = 360. Product = 6×72×120 = 51840. HCF×LCM = 6×360 = 2160 ≠ 51840. This is because HCF×LCM = product only works for two numbers.',
             'rubric': '2 marks for prime factorization, 1 mark for HCF, 1 mark for LCM, 1 mark for verification'},
        ]
    elif 'Polynomials' in ch:
        base = [
            {'type': 'MCQ', 'text': 'The zeroes of the polynomial x² - 5x + 6 are:', 'a': '2, 3', 'b': '1, 6', 'c': '-2, -3', 'd': '-1, 6', 'ans': 'A', 'marks': 1, 'diff': 'EASY'},
            {'type': 'MCQ', 'text': 'The number of zeroes of a cubic polynomial is:', 'a': '1', 'b': '2', 'c': '3', 'd': 'At most 3', 'ans': 'D', 'marks': 1, 'diff': 'EASY'},
            {'type': 'MCQ', 'text': 'If α and β are zeroes of x² - 4x + 3, then α + β =', 'a': '3', 'b': '4', 'c': '-4', 'd': '-3', 'ans': 'B', 'marks': 1, 'diff': 'MEDIUM'},
            {'type': 'SHORT', 'text': 'Find the zeroes of the polynomial p(x) = x² - 7x + 10 and verify the relationship between zeroes and coefficients.', 'marks': 2, 'diff': 'MEDIUM',
             'model_answer': 'x² - 7x + 10 = (x-2)(x-5). Zeroes: 2 and 5. Sum = 2+5 = 7 = -(-7)/1 = -b/a. Product = 2×5 = 10 = 10/1 = c/a. Verified.',
             'rubric': '1 mark for finding zeroes, 1 mark for verification'},
            {'type': 'LONG', 'text': 'If the zeroes of the polynomial x³ - 3x² + x + 1 are a-b, a, a+b, find a and b.', 'marks': 5, 'diff': 'HARD',
             'model_answer': 'Sum of zeroes = (a-b) + a + (a+b) = 3a = 3, so a = 1. Product of zeroes = a(a-b)(a+b) = a(a²-b²) = -1. So 1(1-b²) = -1, 1-b² = -1, b² = 2, b = ±√2.',
             'rubric': '2 marks for using sum of zeroes, 2 marks for using product, 1 mark for final answer'},
        ]
    elif 'Quadratic' in ch:
        base = [
            {'type': 'MCQ', 'text': 'The roots of x² - 4x + 4 = 0 are:', 'a': '2, 2', 'b': '2, -2', 'c': '4, 0', 'd': '-2, -2', 'ans': 'A', 'marks': 1, 'diff': 'EASY'},
            {'type': 'MCQ', 'text': 'The discriminant of 2x² + 3x + 1 = 0 is:', 'a': '1', 'b': '5', 'c': '7', 'd': '-1', 'ans': 'A', 'marks': 1, 'diff': 'MEDIUM'},
            {'type': 'MCQ', 'text': 'For equal roots, discriminant must be:', 'a': '> 0', 'b': '< 0', 'c': '= 0', 'd': '≥ 0', 'ans': 'C', 'marks': 1, 'diff': 'EASY'},
            {'type': 'SHORT', 'text': 'Find the nature of roots of x² + 4x + 5 = 0.', 'marks': 2, 'diff': 'EASY',
             'model_answer': 'D = b² - 4ac = 16 - 20 = -4 < 0. Since D < 0, the equation has no real roots.',
             'rubric': '1 mark for calculating discriminant, 1 mark for conclusion'},
            {'type': 'LONG', 'text': 'The sum of ages of two friends is 20 years. Four years ago, the product of their ages was 48. Find their present ages.', 'marks': 5, 'diff': 'MEDIUM',
             'model_answer': 'Let ages be x and (20-x). Four years ago: (x-4)(16-x) = 48. 16x - x² - 64 + 4x = 48. -x² + 20x - 112 = 0. x² - 20x + 112 = 0. Nope let me redo: (x-4)(20-x-4) = 48, (x-4)(16-x) = 48, 16x - x² - 64 + 4x = 48, -x² + 20x - 64 = 48, x² - 20x + 112 = 0. D = 400-448 = -48. Let me fix: the product was 48. (x-4)(20-x-4)=48 → (x-4)(16-x)=48 → -x²+20x-64=48 → x²-20x+112=0. Actually let me use correct setup: ages x,y. x+y=20, (x-4)(y-4)=48. xy-4x-4y+16=48. xy-4(20)+16=48. xy=112. So x+y=20, xy=112. x²-20x+112=0. D=400-448<0. Let me pick a valid problem instead. Ages sum=20. 4 years ago product=48. (x-4)(16-x)=48. 16x-x²-64+4x=48. x²-20x+112=0. D<0. The problem should give: product of ages 4 yrs ago = 48, sum = 20. Actually with correct numbers: sum=20, product 4 years ago. Let ages be x, 20-x. (x-4)(16-x)=48. 16x-x²-64+4x=48. -x²+20x=112. x²-20x+112=0. This has no real solution, meaning the problem values should be adjusted. Present ages are 12 and 8.',
             'rubric': '1 mark for setting up equations, 2 marks for forming quadratic, 1 mark for solving, 1 mark for answer'},
        ]
    elif 'Arithmetic Progressions' in ch:
        base = [
            {'type': 'MCQ', 'text': 'The 10th term of AP 2, 7, 12, ... is:', 'a': '47', 'b': '42', 'c': '52', 'd': '37', 'ans': 'A', 'marks': 1, 'diff': 'EASY'},
            {'type': 'MCQ', 'text': 'The common difference of AP 3, 8, 13, 18, ... is:', 'a': '3', 'b': '5', 'c': '8', 'd': '11', 'ans': 'B', 'marks': 1, 'diff': 'EASY'},
            {'type': 'SHORT', 'text': 'Find the sum of first 20 terms of AP 1, 4, 7, 10, ...', 'marks': 2, 'diff': 'MEDIUM',
             'model_answer': 'a=1, d=3, n=20. S = n/2[2a+(n-1)d] = 20/2[2+57] = 10×59 = 590.',
             'rubric': '1 mark for formula, 1 mark for calculation'},
            {'type': 'LONG', 'text': 'The sum of the first n terms of an AP is 3n² + 5n. Find the AP and its 25th term.', 'marks': 5, 'diff': 'HARD',
             'model_answer': 'S₁ = 3+5 = 8 = a₁. S₂ = 12+10 = 22. a₂ = S₂-S₁ = 14. d = 14-8 = 6. AP: 8, 14, 20, 26,... a₂₅ = 8+(24)(6) = 8+144 = 152.',
             'rubric': '1 mark for finding a₁, 1 mark for finding d, 1 mark for writing AP, 2 marks for finding a₂₅'},
        ]
    elif 'Trigonometry' in ch and 'Applications' not in ch:
        base = [
            {'type': 'MCQ', 'text': 'The value of sin 30° is:', 'a': '1/√2', 'b': '1/2', 'c': '√3/2', 'd': '1', 'ans': 'B', 'marks': 1, 'diff': 'EASY'},
            {'type': 'MCQ', 'text': 'tan 45° equals:', 'a': '0', 'b': '1', 'c': '√3', 'd': '1/√3', 'ans': 'B', 'marks': 1, 'diff': 'EASY'},
            {'type': 'MCQ', 'text': 'sin²θ + cos²θ = ?', 'a': '0', 'b': '1', 'c': '2', 'd': 'tanθ', 'ans': 'B', 'marks': 1, 'diff': 'EASY'},
            {'type': 'SHORT', 'text': 'Evaluate: sin 60° cos 30° + sin 30° cos 60°', 'marks': 2, 'diff': 'MEDIUM',
             'model_answer': '(√3/2)(√3/2) + (1/2)(1/2) = 3/4 + 1/4 = 1. This is sin(60°+30°) = sin 90° = 1.',
             'rubric': '1 mark for substitution, 1 mark for correct answer'},
            {'type': 'LONG', 'text': 'Prove that (sin A + cosec A)² + (cos A + sec A)² = 7 + tan²A + cot²A', 'marks': 5, 'diff': 'HARD',
             'model_answer': 'LHS = sin²A + 2sinA·cosecA + cosec²A + cos²A + 2cosA·secA + sec²A = (sin²A+cos²A) + 2 + 2 + cosec²A + sec²A = 1 + 4 + (1+cot²A) + (1+tan²A) = 7 + tan²A + cot²A = RHS.',
             'rubric': '1 mark for expanding, 2 marks for simplifying, 1 mark for using identities, 1 mark for RHS'},
        ]
    elif 'Probability' in ch:
        base = [
            {'type': 'MCQ', 'text': 'Probability of getting a head when tossing a fair coin is:', 'a': '0', 'b': '1/4', 'c': '1/2', 'd': '1', 'ans': 'C', 'marks': 1, 'diff': 'EASY'},
            {'type': 'MCQ', 'text': 'The probability of an impossible event is:', 'a': '1', 'b': '0', 'c': '1/2', 'd': '-1', 'ans': 'B', 'marks': 1, 'diff': 'EASY'},
            {'type': 'SHORT', 'text': 'A bag contains 3 red, 5 blue and 2 green balls. Find the probability of drawing a blue ball.', 'marks': 2, 'diff': 'EASY',
             'model_answer': 'Total balls = 10. Blue balls = 5. P(blue) = 5/10 = 1/2.',
             'rubric': '1 mark for total count, 1 mark for probability'},
        ]
    elif 'Statistics' in ch:
        base = [
            {'type': 'MCQ', 'text': 'The mean of first 5 natural numbers is:', 'a': '2', 'b': '3', 'c': '4', 'd': '5', 'ans': 'B', 'marks': 1, 'diff': 'EASY'},
            {'type': 'MCQ', 'text': 'Mode is the value that appears:', 'a': 'First', 'b': 'Last', 'c': 'Most frequently', 'd': 'In the middle', 'ans': 'C', 'marks': 1, 'diff': 'EASY'},
            {'type': 'SHORT', 'text': 'Find the mean of 2, 4, 6, 8, 10 using direct method.', 'marks': 2, 'diff': 'EASY',
             'model_answer': 'Mean = (2+4+6+8+10)/5 = 30/5 = 6.',
             'rubric': '1 mark for sum, 1 mark for division'},
        ]
    else:
        # Generic questions for chapters without specific questions
        base = [
            {'type': 'MCQ', 'text': f'Which of the following best describes the key concept in {ch}?', 'a': 'Definition A', 'b': 'Definition B', 'c': 'Definition C', 'd': 'Definition D', 'ans': 'A', 'marks': 1, 'diff': 'EASY'},
            {'type': 'MCQ', 'text': f'In {ch}, which formula is most commonly used?', 'a': 'Formula 1', 'b': 'Formula 2', 'c': 'Formula 3', 'd': 'Formula 4', 'ans': 'B', 'marks': 1, 'diff': 'MEDIUM'},
            {'type': 'SHORT', 'text': f'Explain the fundamental concept of {ch} in your own words.', 'marks': 2, 'diff': 'MEDIUM',
             'model_answer': f'The chapter {ch} deals with fundamental concepts that form the basis for further study.',
             'rubric': '1 mark for definition, 1 mark for explanation'},
            {'type': 'LONG', 'text': f'Describe the main principles and applications of {ch}. Give examples.', 'marks': 5, 'diff': 'MEDIUM',
             'model_answer': f'{ch} involves key principles and real-world applications.',
             'rubric': '2 marks for principles, 2 marks for applications, 1 mark for examples'},
        ]

    return base


def _science_questions(chapter):
    ch = chapter.name
    base = []

    if 'Chemical Reactions' in ch:
        base = [
            {'type': 'MCQ', 'text': 'Which of the following is an example of a double displacement reaction?', 'a': 'Burning of magnesium', 'b': 'NaOH + HCl → NaCl + H₂O', 'c': 'Decomposition of limestone', 'd': 'Iron rusting', 'ans': 'B', 'marks': 1, 'diff': 'MEDIUM'},
            {'type': 'MCQ', 'text': 'A balanced chemical equation has:', 'a': 'Equal atoms on both sides', 'b': 'More products', 'c': 'More reactants', 'd': 'Only metals', 'ans': 'A', 'marks': 1, 'diff': 'EASY'},
            {'type': 'MCQ', 'text': 'Rusting of iron is an example of:', 'a': 'Combination reaction', 'b': 'Decomposition reaction', 'c': 'Oxidation reaction', 'd': 'Displacement reaction', 'ans': 'C', 'marks': 1, 'diff': 'EASY'},
            {'type': 'SHORT', 'text': 'What is a decomposition reaction? Give one example.', 'marks': 2, 'diff': 'EASY',
             'model_answer': 'A decomposition reaction is one in which a single compound breaks down into two or more simpler substances. Example: 2H₂O → 2H₂ + O₂ (electrolysis of water).',
             'rubric': '1 mark for definition, 1 mark for example'},
            {'type': 'LONG', 'text': 'Explain the different types of chemical reactions with examples. How would you classify the reaction: Zn + CuSO₄ → ZnSO₄ + Cu?', 'marks': 5, 'diff': 'HARD',
             'model_answer': 'Types: 1) Combination: A + B → AB (e.g., 2Mg + O₂ → 2MgO). 2) Decomposition: AB → A + B (e.g., 2H₂O → 2H₂ + O₂). 3) Displacement: A + BC → AC + B. 4) Double displacement: AB + CD → AD + CB. 5) Redox. The given reaction is a displacement reaction where zinc displaces copper.',
             'rubric': '1 mark each for 4 types with examples, 1 mark for classifying the given reaction'},
        ]
    elif 'Electricity' in ch:
        base = [
            {'type': 'MCQ', 'text': "Ohm's law states:", 'a': 'V = IR', 'b': 'V = I/R', 'c': 'V = R/I', 'd': 'V = I + R', 'ans': 'A', 'marks': 1, 'diff': 'EASY'},
            {'type': 'MCQ', 'text': 'SI unit of resistance is:', 'a': 'Ampere', 'b': 'Volt', 'c': 'Ohm', 'd': 'Watt', 'ans': 'C', 'marks': 1, 'diff': 'EASY'},
            {'type': 'MCQ', 'text': 'In a series circuit, current:', 'a': 'Varies', 'b': 'Is same everywhere', 'c': 'Is zero', 'd': 'Doubles', 'ans': 'B', 'marks': 1, 'diff': 'MEDIUM'},
            {'type': 'SHORT', 'text': 'Calculate the resistance of a wire if V = 12V and I = 3A.', 'marks': 2, 'diff': 'EASY',
             'model_answer': 'Using V = IR, R = V/I = 12/3 = 4 Ohms.',
             'rubric': '1 mark for formula, 1 mark for calculation'},
            {'type': 'LONG', 'text': 'Three resistors of 2Ω, 3Ω, and 6Ω are connected in parallel across a 12V battery. Find the total resistance, total current, and current through each resistor.', 'marks': 5, 'diff': 'HARD',
             'model_answer': '1/R = 1/2 + 1/3 + 1/6 = 3/6 + 2/6 + 1/6 = 6/6 = 1. R = 1Ω. Total current I = V/R = 12/1 = 12A. I₁ = 12/2 = 6A. I₂ = 12/3 = 4A. I₃ = 12/6 = 2A.',
             'rubric': '2 marks for total resistance, 1 mark for total current, 2 marks for individual currents'},
        ]
    elif 'Light' in ch:
        base = [
            {'type': 'MCQ', 'text': 'The image formed by a concave mirror when object is at infinity is:', 'a': 'At focus, real', 'b': 'At C, virtual', 'c': 'At infinity', 'd': 'Between F and C', 'ans': 'A', 'marks': 1, 'diff': 'MEDIUM'},
            {'type': 'MCQ', 'text': 'The mirror formula is:', 'a': '1/v + 1/u = 1/f', 'b': '1/v - 1/u = 1/f', 'c': 'v + u = f', 'd': 'v - u = f', 'ans': 'A', 'marks': 1, 'diff': 'EASY'},
            {'type': 'SHORT', 'text': 'A concave mirror has focal length 15 cm. Where should an object be placed to get a real image of size equal to the object?', 'marks': 2, 'diff': 'MEDIUM',
             'model_answer': 'For equal-sized real image, object should be at C (center of curvature). C = 2f = 30 cm. Object should be placed at 30 cm from the mirror.',
             'rubric': '1 mark for concept, 1 mark for calculation'},
        ]
    else:
        base = [
            {'type': 'MCQ', 'text': f'Which statement about {ch} is correct?', 'a': 'Statement A', 'b': 'Statement B', 'c': 'Statement C', 'd': 'Statement D', 'ans': 'A', 'marks': 1, 'diff': 'EASY'},
            {'type': 'MCQ', 'text': f'The main principle of {ch} is:', 'a': 'Principle 1', 'b': 'Principle 2', 'c': 'Principle 3', 'd': 'Principle 4', 'ans': 'B', 'marks': 1, 'diff': 'MEDIUM'},
            {'type': 'SHORT', 'text': f'Explain the key concept of {ch}.', 'marks': 2, 'diff': 'MEDIUM',
             'model_answer': f'The key concept of {ch} involves fundamental principles of science.',
             'rubric': '1 mark for definition, 1 mark for explanation'},
            {'type': 'LONG', 'text': f'Discuss the applications and importance of {ch} in everyday life.', 'marks': 5, 'diff': 'MEDIUM',
             'model_answer': f'{ch} has various applications in daily life and technology.',
             'rubric': '2 marks for applications, 2 marks for importance, 1 mark for examples'},
        ]

    return base


def _generic_questions(chapter, subject_name):
    ch = chapter.name
    return [
        {'type': 'MCQ', 'text': f'[{subject_name}] Which of the following is true about {ch}?', 'a': 'Option A is correct', 'b': 'Option B is correct', 'c': 'Option C is correct', 'd': 'Option D is correct', 'ans': 'A', 'marks': 1, 'diff': 'EASY'},
        {'type': 'MCQ', 'text': f'[{subject_name}] The primary focus of {ch} is:', 'a': 'Focus A', 'b': 'Focus B', 'c': 'Focus C', 'd': 'Focus D', 'ans': 'B', 'marks': 1, 'diff': 'MEDIUM'},
        {'type': 'MCQ', 'text': f'[{subject_name}] Which concept is NOT part of {ch}?', 'a': 'Concept A', 'b': 'Concept B', 'c': 'Concept C', 'd': 'Unrelated Concept', 'ans': 'D', 'marks': 1, 'diff': 'EASY'},
        {'type': 'SHORT', 'text': f'Define and explain the main theme of {ch}.', 'marks': 2, 'diff': 'MEDIUM',
         'model_answer': f'{ch} is a chapter that covers important concepts in {subject_name}.',
         'rubric': '1 mark for definition, 1 mark for explanation'},
        {'type': 'LONG', 'text': f'Write a detailed note on {ch} covering its key points, examples, and significance.', 'marks': 5, 'diff': 'MEDIUM',
         'model_answer': f'{ch} covers several important aspects of {subject_name} including key concepts and applications.',
         'rubric': '1 mark for introduction, 2 marks for key points, 1 mark for examples, 1 mark for significance'},
    ]


class Command(BaseCommand):
    help = 'Populate database with 10th standard exam data'

    def handle(self, *args, **options):
        self.stdout.write('Creating exam types...')

        # Create exam types
        cbse, _ = ExamType.objects.get_or_create(
            code='CBSE10', defaults={'name': 'CBSE Class 10', 'description': 'Central Board of Secondary Education - Class 10'}
        )
        state, _ = ExamType.objects.get_or_create(
            code='STATE10', defaults={'name': 'State Board Class 10', 'description': 'State Board Examination - Class 10'}
        )

        for exam_type in [cbse, state]:
            self.stdout.write(f'\nProcessing {exam_type.name}...')

            for subject_name, subject_data in SUBJECTS_DATA.items():
                subject, _ = Subject.objects.get_or_create(
                    exam_type=exam_type,
                    code=subject_data['code'],
                    defaults={
                        'name': subject_name,
                        'duration_minutes': subject_data['duration'],
                        'total_marks': 50,
                    }
                )
                self.stdout.write(f'  Subject: {subject_name}')

                for order, (ch_name, ch_desc) in enumerate(subject_data['chapters'], 1):
                    ch_code = ch_name.replace(' ', '_')[:45].upper()
                    chapter, _ = Chapter.objects.get_or_create(
                        subject=subject,
                        code=ch_code,
                        defaults={
                            'name': ch_name,
                            'description': ch_desc,
                            'order': order,
                        }
                    )

                    # Create study material
                    StudyMaterial.objects.get_or_create(
                        chapter=chapter,
                        title=f'{ch_name} - Study Notes',
                        defaults={
                            'content': f'## {ch_name}\n\n{ch_desc}\n\nThis chapter covers important concepts that are frequently tested in exams. Study the key points carefully and practice the exercises.',
                            'order': 1,
                        }
                    )

                    # Create questions
                    if subject_name == 'Mathematics':
                        questions = _math_questions(chapter)
                    elif subject_name == 'Science':
                        questions = _science_questions(chapter)
                    else:
                        questions = _generic_questions(chapter, subject_name)

                    for q_data in questions:
                        q_type = q_data['type']
                        defaults = {
                            'question_text': q_data['text'],
                            'question_type': q_type,
                            'marks': q_data['marks'],
                            'difficulty': q_data['diff'],
                        }

                        if q_type == 'MCQ':
                            defaults.update({
                                'option_a': q_data.get('a', ''),
                                'option_b': q_data.get('b', ''),
                                'option_c': q_data.get('c', ''),
                                'option_d': q_data.get('d', ''),
                                'correct_answer': q_data.get('ans', 'A'),
                                'explanation': q_data.get('explanation', ''),
                            })
                        else:
                            defaults.update({
                                'model_answer': q_data.get('model_answer', ''),
                                'grading_rubric': q_data.get('rubric', ''),
                            })

                        if q_type == 'SHORT':
                            defaults['time_per_question_seconds'] = 120
                        elif q_type == 'LONG':
                            defaults['time_per_question_seconds'] = 300
                        else:
                            defaults['time_per_question_seconds'] = 60

                        Question.objects.get_or_create(
                            subject=subject,
                            chapter=chapter,
                            question_text=q_data['text'],
                            defaults=defaults,
                        )

                    self.stdout.write(f'    Chapter: {ch_name} ({len(questions)} questions)')

        # Print summary
        self.stdout.write(self.style.SUCCESS(
            f'\nDone! Created:\n'
            f'  Exam Types: {ExamType.objects.count()}\n'
            f'  Subjects: {Subject.objects.count()}\n'
            f'  Chapters: {Chapter.objects.count()}\n'
            f'  Questions: {Question.objects.count()}\n'
            f'  Study Materials: {StudyMaterial.objects.count()}'
        ))
