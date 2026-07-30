export const conversations = [
  {
    id: 1,
    title: 'Attendance requirements',
    lastMessage: 'What is the minimum attendance required to appear in exams?',
    timestamp: '2026-07-28T10:30:00',
    messages: [
      {
        id: 1,
        role: 'user',
        content: 'What is the minimum attendance required to appear in exams?',
        timestamp: '2026-07-28T10:30:00',
      },
      {
        id: 2,
        role: 'assistant',
        content: 'The minimum attendance required to appear in the semester examination is 75%. Students falling below this threshold may not be permitted to take the examination unless granted special dispensation by the academic council.',
        timestamp: '2026-07-28T10:30:15',
        sources: [
          {
            title: 'Academic Regulations 2026',
            page: 14,
            section: '3.2',
          },
          {
            title: 'Attendance Policy',
            page: 8,
            section: '2.1',
          },
        ],
      },
    ],
  },
  {
    id: 2,
    title: 'Tomorrow\'s class schedule',
    lastMessage: 'Show me my schedule for tomorrow',
    timestamp: '2026-07-27T18:45:00',
    messages: [
      {
        id: 1,
        role: 'user',
        content: 'Show me my schedule for tomorrow',
        timestamp: '2026-07-27T18:45:00',
      },
      {
        id: 2,
        role: 'assistant',
        content: 'Here is your schedule for tomorrow (Tuesday):\n\n**10:00 AM - 11:00 AM**\nDatabase Systems (CS504)\nFaculty: Dr. Neha Gupta\nRoom: A-301\n\n**02:00 PM - 03:30 PM**\nArtificial Intelligence (CS502)\nFaculty: Dr. Priya Sharma\nRoom: B-102',
        timestamp: '2026-07-27T18:45:20',
        sources: [],
      },
    ],
  },
  {
    id: 3,
    title: 'Placement eligibility',
    lastMessage: 'Am I eligible for the TechNova placement?',
    timestamp: '2026-07-26T14:20:00',
    messages: [
      {
        id: 1,
        role: 'user',
        content: 'Am I eligible for the TechNova placement?',
        timestamp: '2026-07-26T14:20:00',
      },
      {
        id: 2,
        role: 'assistant',
        content: 'Based on your current academic record:\n\n**Eligibility Check for TechNova:**\n- Attendance: 82% ✓ (Required: 75%)\n- CGPA: 7.8 ✓ (Required: 7.5+)\n- Backlogs: None ✓ (Required: None)\n\n**Status: ELIGIBLE** ✓\n\nYou meet all the eligibility criteria for the TechNova Graduate Software Engineer position. The deadline to apply is August 8, 2026.',
        timestamp: '2026-07-26T14:20:30',
        sources: [
          {
            title: 'Placement Cell Guidelines',
            page: 5,
            section: '3.1',
          },
        ],
      },
    ],
  },
  {
    id: 4,
    title: 'Exam registration process',
    lastMessage: 'How do I register for the upcoming exams?',
    timestamp: '2026-07-25T11:00:00',
    messages: [
      {
        id: 1,
        role: 'user',
        content: 'How do I register for the upcoming exams?',
        timestamp: '2026-07-25T11:00:00',
      },
      {
        id: 2,
        role: 'assistant',
        content: 'To register for the upcoming semester examinations:\n\n1. Log in to the student portal\n2. Navigate to "Examination" section\n3. Click on "Exam Registration"\n4. Verify your subjects and attendance\n5. Pay the examination fee (if applicable)\n6. Submit the registration form\n\n**Important:**\n- Registration closes 7 days before the exam start date\n- Ensure you have 75%+ attendance in all subjects\n- Contact the examination cell if you face any issues',
        timestamp: '2026-07-25T11:00:25',
        sources: [
          {
            title: 'Examination Guidelines',
            page: 12,
            section: '4.1',
          },
        ],
      },
    ],
  },
];
