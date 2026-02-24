import { adminSettingsRepository } from './repositories';

export async function getEmailLogs(limit = 100) {
  const logs = await adminSettingsRepository.findEmailLogs(limit);

  return logs.map(log => ({
    id: log.id,
    toEmail: log.toEmail,
    toName: log.toName,
    subject: log.subject,
    templateName: log.templateName,
    status: log.status,
    sentAt: log.sentAt.toISOString(),
    errorMessage: log.errorMessage,
  }));
}
