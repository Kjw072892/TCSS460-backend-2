import { PrismaClient } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const USERS = [
  { username: 'jchen', email: 'jchen@example.com', firstName: 'Jessica', lastName: 'Chen' },
  {
    username: 'mwilliams',
    email: 'mwilliams@example.com',
    firstName: 'Marcus',
    lastName: 'Williams',
  },
  { username: 'agarcia', email: 'agarcia@example.com', firstName: 'Ana', lastName: 'Garcia' },
  { username: 'dpatel', email: 'dpatel@example.com', firstName: 'Dev', lastName: 'Patel' },
  { username: 'slee', email: 'slee@example.com', firstName: 'Sarah', lastName: 'Lee' },
  { username: 'rjohnson', email: 'rjohnson@example.com', firstName: 'Robert', lastName: 'Johnson' },
  { username: 'kkim', email: 'kkim@example.com', firstName: 'Kevin', lastName: 'Kim' },
  { username: 'lnguyen', email: 'lnguyen@example.com', firstName: 'Lisa', lastName: 'Nguyen' },
  { username: 'tbrown', email: 'tbrown@example.com', firstName: 'Tyler', lastName: 'Brown' },
  { username: 'emartin', email: 'emartin@example.com', firstName: 'Emily', lastName: 'Martin' },
  { username: 'jrivera', email: 'jrivera@example.com', firstName: 'James', lastName: 'Rivera' },
  {
    username: 'nthompson',
    email: 'nthompson@example.com',
    firstName: 'Nina',
    lastName: 'Thompson',
  },
  { username: 'awright', email: 'awright@example.com', firstName: 'Alex', lastName: 'Wright' },
  {
    username: 'mhernandez',
    email: 'mhernandez@example.com',
    firstName: 'Maria',
    lastName: 'Hernandez',
  },
  { username: 'cjones', email: 'cjones@example.com', firstName: 'Chris', lastName: 'Jones' },
  { username: 'pzhang', email: 'pzhang@example.com', firstName: 'Peter', lastName: 'Zhang' },
  { username: 'rdavis', email: 'rdavis@example.com', firstName: 'Rachel', lastName: 'Davis' },
  { username: 'oturner', email: 'oturner@example.com', firstName: 'Omar', lastName: 'Turner' },
  { username: 'hpark', email: 'hpark@example.com', firstName: 'Hannah', lastName: 'Park' },
  { username: 'bclark', email: 'bclark@example.com', firstName: 'Brian', lastName: 'Clark' },
  { username: 'swoods', email: 'swoods@example.com', firstName: 'Sophia', lastName: 'Woods' },
  { username: 'dmorgan', email: 'dmorgan@example.com', firstName: 'Daniel', lastName: 'Morgan' },
  { username: 'jfoster', email: 'jfoster@example.com', firstName: 'Julia', lastName: 'Foster' },
  { username: 'icooper', email: 'icooper@example.com', firstName: 'Ian', lastName: 'Cooper' },
  { username: 'mreyes', email: 'mreyes@example.com', firstName: 'Monica', lastName: 'Reyes' },
];

const MESSAGES = [
  'Hey, are we still meeting at 3pm today?',
  'Just finished the quarterly report. Take a look when you get a chance.',
  'Can you send me the updated project timeline?',
  'Great presentation yesterday! The team loved it.',
  'Reminder: team lunch is this Friday at noon.',
  'The client wants to push the deadline back two weeks. Thoughts?',
  'I updated the shared doc with my notes from the meeting.',
  'Has anyone seen my badge? I think I left it in the conference room.',
  'The build is broken again. I think it was the last merge.',
  'Quick heads up — I will be out of office tomorrow.',
  'Thanks for covering for me last week. I really appreciate it.',
  'Can we schedule a code review for the new feature branch?',
  'The database migration ran successfully in staging.',
  'FYI, the parking lot will be closed next Monday for repairs.',
  'I sent you the API docs. Let me know if anything is unclear.',
  'Anyone free for a coffee run? I need a break.',
  'The test suite is passing now. All 47 tests green.',
  'Just pushed the fix for the login bug. Can someone verify?',
  'Happy birthday! Hope you have a great day.',
  'The new hire starts next Tuesday. Can you set up their workstation?',
  'I found the issue — it was a missing semicolon in the config.',
  'The design team approved the new mockups. We can start building.',
  'Sprint planning is moved to Wednesday this week.',
  'Does anyone have experience with Docker Compose networking?',
  'The server went down briefly around 2am but auto-recovered.',
  'I am working from home today. Reachable on Slack all day.',
  'Can you review my pull request when you have a minute?',
  'The customer feedback survey results are in. Mostly positive!',
  'Do not forget to submit your timesheets by end of day Friday.',
  'I set up the staging environment. The URL is in the wiki.',
  'The caching layer reduced response times by 40%. Nice win.',
  'My internet is flaky today, so I might drop off calls occasionally.',
  'Who is responsible for the on-call rotation next week?',
  'The product manager wants a demo ready by Thursday.',
  'I refactored the authentication middleware. Much cleaner now.',
  'Lunch meeting canceled. We will do async updates instead.',
  'The new feature flag system is live. Documentation is on Confluence.',
  'Can someone check if the email service is running? I got a bounce.',
  'I just realized we have a naming collision in the API routes.',
  'The intern did a great job on the dashboard redesign.',
  'Heads up: we are switching to a new CI provider next month.',
  'The load test results look promising. We can handle 10k concurrent users.',
  'I left some comments on the architecture doc. Nothing major.',
  'The WiFi in the east wing is really slow today.',
  'I need someone to pair program with me on the payment integration.',
  'Just got back from vacation. What did I miss?',
  'The security audit found two medium-severity issues. I am on it.',
  'Can we add a health check endpoint to the API?',
  'The new monitoring dashboard is really helpful for debugging.',
  'I accidentally deleted the wrong branch. Can someone help me recover it?',
];

const SUBJECTS = [
  'Quick question',
  'Meeting update',
  'Project status',
  null,
  'FYI',
  'Lunch plans',
  null,
  'Code review needed',
  'Bug report',
  null,
  'Schedule change',
  'Action required',
  null,
  null,
  'Team announcement',
  'Help needed',
  null,
  'Follow-up',
  'Heads up',
  null,
];

function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

async function main() {
  // eslint-disable-next-line no-console
  console.log('Seeding database...');

  // Clear existing data
  await prisma.message.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const createdUsers = await prisma.user.createManyAndReturn({
    data: USERS,
  });

  // eslint-disable-next-line no-console
  console.log(`Created ${createdUsers.length} users`);

  // Create ~500 messages
  const messageData = Array.from({ length: 500 }, () => ({
    content: randomItem(MESSAGES),
    subject: randomItem(SUBJECTS),
    read: Math.random() > 0.3,
    authorId: randomItem(createdUsers).id,
  }));

  const messageResult = await prisma.message.createMany({
    data: messageData,
  });

  // eslint-disable-next-line no-console
  console.log(`Created ${messageResult.count} messages`);

  // eslint-disable-next-line no-console
  console.log('Seeding complete!');
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
