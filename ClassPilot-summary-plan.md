# ClassPilot Summary Plan

## Project Vision

ClassPilot is a modern teacher plan book for building, organizing, and adapting a school year. The first version is designed for one Grade 6 homeroom teacher, combining subject-area unit planning, daily lesson planning, class routines, curriculum outcome tracking, student information, and AI-assisted planning in one workspace.

The goal is to give teachers the same confidence as a traditional paper plan book, but with the flexibility of a project planner and the intelligence of an assistant that understands curriculum outcomes, lesson history, class schedules, and pacing constraints.

## Core Idea

The first version should help a Grade 6 homeroom teacher map the school year at three connected levels:

1. **School year calendar** - terms, holidays, non-instructional days, reporting periods, assemblies, field trips, and other interruptions.
2. **Subject-area unit timeline** - draggable units placed across the calendar for ELA, math, science, social studies, homeroom routines, and other elementary blocks.
3. **Lesson plan book** - daily lessons generated, edited, reused, and connected back to curriculum outcomes, unit goals, and the real classroom timetable.

The unit planner should feel like a project planning board for an elementary classroom: each subject or recurring homeroom block appears as a row, time runs horizontally across the school year, and units appear as movable blocks that can be stretched, shifted, sequenced, or copied. Lessons live inside those units and can be opened from the timeline or from a daily/weekly plan book view.

ClassPilot should also act as a private classroom information system for the homeroom. Student records should connect to planning without turning the product into a full school SIS. The goal is to keep the teacher's working knowledge organized: learner profiles, family/contact notes, accommodations, intervention notes, assessment evidence, behavior/attendance observations, and follow-up reminders.

## Main Users

ClassPilot is initially for a Grade 6 homeroom teacher who needs to plan across multiple elementary subjects, align instruction to curriculum, manage classroom routines, reuse strong lesson materials, and adjust pacing throughout the year.

Later versions could expand to high school course planning, department planning, instructional coaching, substitute teacher packets, or school administrator visibility, but those are not first-version priorities.

## Key Features

### Teacher Plan Book

- Daily, weekly, monthly, and year views
- Homeroom timetable with subject blocks, specialist classes, routines, recess/lunch, and calendar exceptions
- Lesson plans attached to specific class periods
- Quick rescheduling when a class is missed or a lesson runs long
- Substitute-friendly lesson exports
- Notes for reflection, follow-up, assessment, and student needs

### Unit Planner Timeline

- School year timeline with rows for each elementary subject, course block, or homeroom routine
- Drag-and-drop unit blocks across calendar dates
- Resize units to adjust duration
- Visual pacing indicators for lessons, assessments, holidays, and missed days
- Unit outline side panel with goals, outcomes, lessons, resources, assessments, and notes
- Warning indicators when a unit has too many lessons for the available instructional days
- Ability to copy a unit to another class, term, or future school year

### Curriculum Outcome Database

- Searchable curriculum outcomes by province/state, grade, subject, strand, and keyword
- Outcome tagging at the unit, lesson, activity, and assessment level
- Coverage tracking across the school year
- Gap detection for outcomes not yet planned
- Overlap detection for outcomes that are repeated too often without progression
- Teacher-friendly summaries of formal curriculum language

### Lesson Plan Database

- Searchable library of lesson plans, activities, assessments, projects, rubrics, and resources
- Filters by grade, subject, time required, outcome, teaching strategy, assessment type, and materials
- Personal, school, district, and public lesson libraries
- Versioning so teachers can adapt a lesson without losing the original
- Import support for documents, PDFs, links, and previous plan books

### Lesson Import and Resources

- Initial Markdown lesson import is now available at `/lessons/import` for one lesson per `.md` file or pasted Markdown.
- The current import stores the lesson sections in the lesson summary so structure is preserved while the richer lesson model is still being designed.
- A starter `.md` template lives at `docs/lesson-import-template.md` so lesson sections are predictable and importable:
  - title
  - date
  - subject
  - unit
  - outcomes
  - duration
  - materials
  - lesson flow
  - assessment
  - differentiation
  - reflection
  - links
  - attachments
- Imported markdown should preserve section structure rather than flattening everything into one note.
- Lessons should support resource attachments: local files, images, videos, web links, and eventually Google Drive files.
- Local file uploads should be stored in the self-hosted file storage path and linked to the lesson record.
- Google Drive integration should be a later explicit connector step because it introduces third-party account access and privacy considerations.
- Any uploaded or linked student-sensitive files should follow the same privacy rules as the student information CMS.

### Student Information CMS

- Private Grade 6 class roster with student profiles
- Student notes organized by category, date, subject, and follow-up status
- Family/contact information and communication history
- Learning needs, strengths, accommodations, interventions, and support plans
- Assessment evidence linked to outcomes, lessons, units, and student profiles
- Behavior, attendance, participation, and social-emotional observations
- Reminders for follow-ups, missing work, parent contact, and support actions
- Exportable student summaries for meetings, report writing, and transition planning
- Sensitive information safeguards: local-only storage, clear backups, and no public sharing by default

### AI Planning Assistant

- Generate unit outlines from selected outcomes, time available, class profile, and preferred teaching style
- Draft lesson plans that fit the timetable and instructional minutes available
- Suggest sequencing, pacing, assessments, differentiation, and review days
- Adapt existing lessons for grade level, student needs, time constraints, or available materials
- Identify missing outcomes, overloaded units, or unrealistic pacing
- Create substitute plans, parent-friendly summaries, rubrics, and assessment prompts
- Summarize student notes for teacher reflection, meetings, and planning while keeping the source records private
- Preserve teacher control: AI suggests, the teacher approves and edits

## Planning Workflow

1. **Set up the school year**
   - Choose calendar dates, terms, holidays, non-instructional days, and reporting periods.
   - Add the homeroom, subject blocks, routines, specialist classes, and timetable rules.

2. **Select curriculum**
   - Choose the relevant jurisdiction, Grade 6 subject areas, and curriculum outcomes.
   - Pin required outcomes to the class planning workspace.

3. **Build units**
   - Create units manually or ask AI to draft a suggested year plan.
   - Place units on the year timeline.
   - Assign outcomes, essential questions, assessments, and target dates.

4. **Plan lessons**
   - Generate or select lessons from the lesson database.
   - Attach lessons to instructional days inside each unit.
   - Adjust for real calendar constraints, shortened periods, and missed classes.

5. **Teach and adjust**
   - Mark lessons complete, delayed, skipped, or revised.
   - Capture notes and reflections.
   - Shift future lessons and units when pacing changes.

6. **Track coverage**
   - View which outcomes have been introduced, practiced, assessed, or not yet addressed.
   - Generate reports for teacher reflection, department planning, or administration.

7. **Maintain student information**
   - Keep roster details, learner profiles, notes, accommodations, family contact history, and assessment evidence in one private workspace.
   - Link student information back to lessons, units, outcomes, and follow-up reminders.

## Suggested MVP

The first version should focus on the planning loop, not every possible school workflow.

MVP features:

- Teacher account and school year setup
- Grade 6 homeroom profile and basic timetable
- Year calendar with holidays and non-instructional days
- Unit timeline planner with draggable/resizable units
- Unit detail panel
- Lesson list inside each unit
- Basic daily and weekly plan book views
- Curriculum outcome database import for one starting jurisdiction and Grade 6 subject set
- Outcome tagging for units and lessons
- Student roster and profile pages
- Student notes, accommodations, contact log, and follow-up reminders
- Basic links between students, lessons, outcomes, and assessment evidence
- AI-generated unit outline and lesson draft
- Simple lesson library with save, duplicate, and reuse

## Technical Direction

ClassPilot should start as a personal, self-hosted homelab application rather than a public SaaS product. The first version should optimize for one Grade 6 homeroom teacher, one private deployment, simple maintenance, and dependable access from a phone and computer.

Recommended stack:

- **Application framework:** Next.js with React and TypeScript
- **Interface:** responsive web app with a strong desktop planning experience and a phone-friendly PWA
- **Styling and components:** Tailwind CSS with shadcn/ui or a similar practical component system
- **Database:** SQLite for the first personal homelab version, with a future migration path to PostgreSQL
- **Data access:** a small repository layer over SQLite first; Drizzle or Prisma can be introduced when the schema stabilizes or PostgreSQL becomes necessary
- **AI integration:** OpenAI API or another model provider behind a small internal AI service layer
- **File storage:** local mounted storage or S3-compatible storage such as MinIO
- **Deployment:** Docker Compose on the homelab, behind the existing reverse proxy and private domain setup
- **Backups:** scheduled PostgreSQL backups plus a copy of uploaded resources and configuration

The PWA should be the main mobile target. It should install to the iPhone home screen, work well in mobile Safari, and support quick access to the current day, lesson notes, and schedule. A native iOS app can remain a future roadmap option, but the first product should avoid maintaining a separate mobile codebase.

Because this is a personal tool, the first version does not need multi-tenant billing, school district administration, public account signup, marketplace features, or SaaS-grade permission complexity. The architecture should still keep clean boundaries between the calendar, timetable, subject areas, units, lessons, curriculum outcomes, lesson library, student information CMS, and AI planner so the project can grow without becoming tangled.

Student information should be treated as the most sensitive data in the system. It should remain private to the self-hosted deployment, be included in deliberate encrypted backup planning, and avoid unnecessary transmission to AI providers. When AI features use student context, ClassPilot should prefer teacher-approved summaries or de-identified context unless the teacher intentionally includes identifiable details.

SQLite-first database direction:

- Store the first version in `data/classpilot.sqlite`.
- Keep database access behind repository modules instead of calling SQLite directly from UI components.
- Use explicit schema and seed scripts so the data model can later be translated to PostgreSQL.
- Mount `./data:/app/data` in Docker so the database survives container rebuilds.
- Exclude local database files from git.
- Plan encrypted backups before entering real student information.

Access control direction:

- Require login before any planner, lesson, unit, outcome, or student information pages load.
- Use an HTTP-only signed session cookie for the first self-hosted version.
- Configure `CLASSPILOT_APP_PASSWORD` and `CLASSPILOT_AUTH_SECRET` before entering real data.
- Use non-secure cookies for local HTTP testing and secure cookies for HTTPS deployments by setting `CLASSPILOT_COOKIE_SECURE=true`.
- Keep the auth layer simple for one-user homelab use, but preserve a clean path to stronger auth later if remote access expands.

Initial local run path:

- Development: `npm run dev`
- Production build check: `npm run build`
- Homelab container: copy `.env.example` to `.env`, adjust `CLASSPILOT_PORT`, then run `docker compose up -d --build`

## Later Features

- Multi-teacher collaboration
- Department-wide curriculum maps
- School or district lesson libraries
- Assessment and gradebook integrations
- LMS export to Google Classroom, Canvas, Moodle, or similar platforms
- Substitute teacher packets
- Parent communication summaries
- Student accommodation and differentiation profiles
- Analytics for pacing, coverage, and assessment balance
- Mobile companion view for quick notes during the school day
- High school mode with separate course sections, periods, and semester-based pacing
- More advanced student information workflows such as report card drafting, conference notes, transition records, and longitudinal growth views

## Design Direction

ClassPilot should feel calm, fast, and practical. Teachers are already overloaded, so the interface should prioritize scanning, quick edits, and confidence.

The unit timeline should be the signature view:

- Rows represent Grade 6 subject areas or homeroom routines.
- Columns represent school days or weeks.
- Unit blocks show duration, subject color, title, and progress.
- Lesson markers show planned lesson density.
- Calendar interruptions are visible directly on the timeline.
- Clicking a unit opens a focused planning panel.
- Dragging a unit updates its dates and automatically suggests lesson rescheduling.

The daily plan book should feel familiar to teachers, while the unit planner should feel more like modern project management adapted to school reality.

## Product Promise

ClassPilot helps teachers answer the questions that matter every week:

- What am I teaching today?
- Where does this lesson fit in the unit?
- Which outcomes does it support?
- Am I on pace for the term?
- What should I adjust because of the real school calendar?
- Can I reuse or improve what I planned before?
- What do I need to remember about each student before I teach, assess, or contact home?

The product should not replace teacher judgment. It should remove planning friction, make curriculum alignment visible, and give teachers a better way to move from long-range plans to tomorrow's lesson.
