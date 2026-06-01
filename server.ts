import express from "express";
import path from "path";
import cors from "cors";
import nodemailer from "nodemailer";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  const getTransporter = () => {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
      console.warn("SMTP credentials missing. Email notifications will be skipped.");
      return null;
    }

    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  };

  app.post("/api/notify-lesson", async (req, res) => {
    const { email, lessonDetails } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const transporter = getTransporter();
    if (!transporter) {
      return res.status(200).json({ status: "skipped", message: "SMTP not configured" });
    }

    try {
      await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || "SWIMSchedule"}" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `課程預約通知 - ${lessonDetails.date}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #334155;">
            <h2 style="color: #0f766e;">課程預約通知</h2>
            <p>您的課程已建立，以下是課程資訊：</p>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #0f766e;">
              <p><strong>日期：</strong>${lessonDetails.date}</p>
              <p><strong>時間：</strong>${lessonDetails.startTime} - ${lessonDetails.endTime}</p>
              <p><strong>泳池：</strong>${lessonDetails.poolType}</p>
              <p><strong>課程類型：</strong>${lessonDetails.lessonType}</p>
              <p><strong>教練：</strong>${lessonDetails.coachName}</p>
            </div>
            <p style="margin-top: 20px; font-size: 14px; color: #64748b;">
              此郵件由 SWIMSchedule 系統自動發送。
            </p>
          </div>
        `,
      });

      res.json({ status: "success", message: "Email sent" });
    } catch (error) {
      console.error("Email error:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
