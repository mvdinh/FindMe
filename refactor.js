const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'client/src');
const filesToUpdate = [
  'utils/jsonReadable.jsx',
  'hr/pages/HRProfile.jsx',
  'hr/pages/HRNotifications.jsx',
  'hr/pages/HRJobManagement.jsx',
  'hr/pages/HRJobApplications.jsx',
  'hr/pages/HRDashboard.jsx',
  'hr/pages/HRApplicationManagement.jsx',
  'components/notifications/NotificationDetailPage.jsx',
  'applicant/pages/JobDetailsPage.jsx',
  'applicant/pages/ProfilePage.jsx',
  'applicant/pages/SavedJobsPage.jsx',
  'applicant/pages/MessagesPage.jsx',
  'applicant/pages/JobApplicationPage.jsx',
  'applicant/pages/ApplicationsPage.jsx',
  'admin/pages/JobStatusRequestsPage.jsx',
  'admin/pages/HRManagementPage.jsx',
  'admin/pages/AllJobsPage.jsx',
  'admin/pages/AdminNotifications.jsx',
  'admin/pages/AdminAccountsPage.jsx'
];

for (const relPath of filesToUpdate) {
  const fullPath = path.join(srcDir, relPath);
  if (!fs.existsSync(fullPath)) continue;
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Replace import { ... } from '...DateFormat';
  content = content.replace(/from\s+['"](?:\.\.\/)+.*?DateFormat['"]/g, 'from "@/utils/dateFormat"');
  content = content.replace(/from\s+['"]\.\/.*?DateFormat['"]/g, 'from "@/utils/dateFormat"');
  
  fs.writeFileSync(fullPath, content);
}
console.log('Imports updated successfully.');
