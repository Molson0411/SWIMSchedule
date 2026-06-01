import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface LessonNotificationDetails {
  date: string;
  startTime: string;
  endTime: string;
  poolType: string;
  lessonType: string;
  coachName: string;
}

interface NotifyLessonInput {
  email: string;
  lessonDetails: LessonNotificationDetails;
}

function getNotificationApiUrl() {
  const configuredUrl = import.meta.env.VITE_NOTIFY_LESSON_URL as string | undefined;
  if (configuredUrl) return configuredUrl;

  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  return isLocalhost ? '/api/notify-lesson' : '';
}

function buildLessonEmail(details: LessonNotificationDetails) {
  const subject = `課程預約通知 - ${details.date}`;
  const text = [
    '您的課程已建立。',
    `日期：${details.date}`,
    `時間：${details.startTime} - ${details.endTime}`,
    `泳池：${details.poolType}`,
    `課程類型：${details.lessonType}`,
    `教練：${details.coachName}`,
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #334155;">
      <h2 style="color: #0f766e; margin-top: 0;">課程預約通知</h2>
      <p>您的課程已建立，以下是課程資訊：</p>
      <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #0f766e;">
        <p><strong>日期：</strong>${details.date}</p>
        <p><strong>時間：</strong>${details.startTime} - ${details.endTime}</p>
        <p><strong>泳池：</strong>${details.poolType}</p>
        <p><strong>課程類型：</strong>${details.lessonType}</p>
        <p><strong>教練：</strong>${details.coachName}</p>
      </div>
      <p style="margin-top: 20px; font-size: 14px; color: #64748b;">
        此郵件由 SWIMSchedule 系統自動發送。
      </p>
    </div>
  `;

  return { subject, text, html };
}

async function notifyViaApi(input: NotifyLessonInput) {
  const apiUrl = getNotificationApiUrl();
  if (!apiUrl) return false;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Notification API failed with ${response.status}`);
  }

  return true;
}

async function notifyViaFirestoreMail(input: NotifyLessonInput) {
  const message = buildLessonEmail(input.lessonDetails);

  await addDoc(collection(db, 'mail'), {
    to: input.email,
    message,
    createdAt: serverTimestamp(),
    type: 'lesson-confirmation',
  });
}

export const notificationService = {
  async notifyLessonCreated(input: NotifyLessonInput) {
    try {
      const sentByApi = await notifyViaApi(input);
      if (sentByApi) return;
    } catch (error) {
      console.warn('Notification API failed, falling back to Firestore mail.', error);
    }

    await notifyViaFirestoreMail(input);
  },
};
