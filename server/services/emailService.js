const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

/**
 * Email Service for sending alert notifications
 */

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  initializeTransporter() {
    try {
      // Gmail configuration (update with your email service)
      this.transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS // Use app-specific password for Gmail
        }
      });

      // Test the connection
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('❌ Email service configuration error:', error.message);
          this.isConfigured = false;
        } else {
          console.log('✅ Email service configured successfully');
          this.isConfigured = true;
        }
      });

    } catch (error) {
      console.error('❌ Failed to initialize email transporter:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Send alert notification email
   */
  async sendAlertNotification(user, alert, currentValue, quote) {
    if (!this.isConfigured) {
      console.log('📧 Email service not configured - notification logged instead');
      this.logNotification(user, alert, currentValue, quote);
      return;
    }

    try {
      const subject = this.generateSubject(alert, quote);
      const htmlContent = this.generateAlertHTML(alert, currentValue, quote);
      const textContent = this.generateAlertText(alert, currentValue, quote);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: subject,
        text: textContent,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Alert email sent to ${user.email} (Message ID: ${result.messageId})`);
      
      return result;

    } catch (error) {
      console.error(`❌ Failed to send alert email to ${user.email}:`, error.message);
      // Fallback to logging
      this.logNotification(user, alert, currentValue, quote);
      throw error;
    }
  }

  /**
   * Generate email subject
   */
  generateSubject(alert, quote) {
    const direction = quote.change >= 0 ? '📈' : '📉';
    const urgency = Math.abs(quote.changePercent) > 5 ? '🚨 URGENT' : '🔔';
    
    return `${urgency} ${direction} ${alert.symbol} Alert: ${alert.description}`;
  }

  /**
   * Generate HTML email content
   */
  generateAlertHTML(alert, currentValue, quote) {
    const changeColor = quote.change >= 0 ? '#22c55e' : '#ef4444';
    const changeIcon = quote.change >= 0 ? '📈' : '📉';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Stock Alert Notification</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
          }
          .container {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
          }
          .alert-title {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
            margin: 10px 0;
          }
          .symbol {
            font-size: 32px;
            font-weight: bold;
            color: #3b82f6;
            margin: 10px 0;
          }
          .metrics {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
          }
          .metric {
            background: #f9fafb;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
          }
          .metric-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 5px;
          }
          .metric-value {
            font-size: 20px;
            font-weight: bold;
            color: #1f2937;
          }
          .change-positive { color: #22c55e; }
          .change-negative { color: #ef4444; }
          .alert-details {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .alert-description {
            font-size: 16px;
            font-weight: 600;
            color: #92400e;
            margin-bottom: 10px;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
          }
          .timestamp {
            color: #9ca3af;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="font-size: 48px; margin-bottom: 10px;">🚨</div>
            <div class="alert-title">Stock Alert Triggered</div>
            <div class="symbol">${alert.symbol}</div>
          </div>

          <div class="metrics">
            <div class="metric">
              <div class="metric-label">Current Price</div>
              <div class="metric-value">$${quote.price.toFixed(2)}</div>
            </div>
            <div class="metric">
              <div class="metric-label">Change</div>
              <div class="metric-value ${quote.change >= 0 ? 'change-positive' : 'change-negative'}">
                ${changeIcon} ${quote.changePercent.toFixed(2)}%
              </div>
            </div>
            <div class="metric">
              <div class="metric-label">Volume</div>
              <div class="metric-value">${quote.volume?.toLocaleString() || 'N/A'}</div>
            </div>
            <div class="metric">
              <div class="metric-label">Current Value</div>
              <div class="metric-value">${currentValue}</div>
            </div>
          </div>

          <div class="alert-details">
            <div class="alert-description">${alert.description}</div>
            <div><strong>Alert Type:</strong> ${alert.alertType.toUpperCase()}</div>
            <div><strong>Condition:</strong> ${alert.condition}</div>
            <div><strong>Target Value:</strong> ${alert.targetValue}</div>
            ${alert.indicatorType ? `<div><strong>Indicator:</strong> ${alert.indicatorType.toUpperCase()}</div>` : ''}
          </div>

          <div class="footer">
            <div>Stock Market Alert System</div>
            <div class="timestamp">Triggered at ${new Date().toLocaleString()}</div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text email content
   */
  generateAlertText(alert, currentValue, quote) {
    return `
🚨 STOCK ALERT TRIGGERED 🚨

Stock: ${alert.symbol}
Description: ${alert.description}

Current Metrics:
- Price: $${quote.price.toFixed(2)}
- Change: ${quote.changePercent.toFixed(2)}%
- Volume: ${quote.volume?.toLocaleString() || 'N/A'}
- Current Value: ${currentValue}

Alert Details:
- Type: ${alert.alertType.toUpperCase()}
- Condition: ${alert.condition}
- Target: ${alert.targetValue}
${alert.indicatorType ? `- Indicator: ${alert.indicatorType.toUpperCase()}` : ''}

Triggered at: ${new Date().toLocaleString()}

---
Stock Market Alert System
    `.trim();
  }

  /**
   * Log notification when email is not configured
   */
  logNotification(user, alert, currentValue, quote) {
    console.log('\n📧 EMAIL NOTIFICATION (SIMULATED)');
    console.log('=====================================');
    console.log(`To: ${user.email}`);
    console.log(`Subject: ${this.generateSubject(alert, quote)}`);
    console.log('\nContent:');
    console.log(this.generateAlertText(alert, currentValue, quote));
    console.log('=====================================\n');
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(user) {
    if (!this.isConfigured) {
      console.log(`📧 Welcome email would be sent to ${user.email}`);
      return;
    }

    try {
      const subject = '🎉 Welcome to Stock Market Alert System';
      const htmlContent = this.generateWelcomeHTML(user);
      const textContent = this.generateWelcomeText(user);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: subject,
        text: textContent,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email sent to ${user.email}`);
      
      return result;

    } catch (error) {
      console.error(`❌ Failed to send welcome email to ${user.email}:`, error.message);
      throw error;
    }
  }

  /**
   * Generate welcome email HTML
   */
  generateWelcomeHTML(user) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Stock Alert System</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; background: #3b82f6; color: white; padding: 30px; border-radius: 8px; }
          .content { padding: 30px 0; }
          .feature { margin: 20px 0; padding: 15px; background: #f8fafc; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Stock Alert System!</h1>
            <p>Start monitoring your favorite stocks today</p>
          </div>
          <div class="content">
            <h2>Hi ${user.firstName}!</h2>
            <p>Thanks for joining our Stock Market Alert System. You can now:</p>
            
            <div class="feature">
              <h3>📊 Track Real-time Stock Data</h3>
              <p>Get live quotes, charts, and market data for any stock</p>
            </div>
            
            <div class="feature">
              <h3>🔔 Set Custom Alerts</h3>
              <p>Create price, volume, and technical indicator alerts</p>
            </div>
            
            <div class="feature">
              <h3>📈 Technical Analysis</h3>
              <p>Monitor RSI, Moving Averages, MACD, and more</p>
            </div>
            
            <div class="feature">
              <h3>📧 Email Notifications</h3>
              <p>Get instant notifications when your alerts trigger</p>
            </div>
            
            <p>Start by creating your first alert and begin monitoring the stocks you care about!</p>
            
            <p>Happy Trading!<br>
            The Stock Alert Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate welcome email text
   */
  generateWelcomeText(user) {
    return `
🎉 Welcome to Stock Market Alert System!

Hi ${user.firstName}!

Thanks for joining our Stock Market Alert System. You can now:

📊 Track Real-time Stock Data
Get live quotes, charts, and market data for any stock

🔔 Set Custom Alerts  
Create price, volume, and technical indicator alerts

📈 Technical Analysis
Monitor RSI, Moving Averages, MACD, and more

📧 Email Notifications
Get instant notifications when your alerts trigger

Start by creating your first alert and begin monitoring the stocks you care about!

Happy Trading!
The Stock Alert Team
    `.trim();
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration() {
    if (!this.isConfigured) {
      throw new Error('Email service not configured');
    }

    try {
      const testEmail = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER, // Send to self
        subject: '🧪 Stock Alert System - Email Test',
        text: 'This is a test email from the Stock Alert System. Email service is working correctly!',
        html: '<p>This is a test email from the <strong>Stock Alert System</strong>. Email service is working correctly! ✅</p>'
      };

      const result = await this.transporter.sendMail(testEmail);
      console.log('✅ Test email sent successfully:', result.messageId);
      return result;

    } catch (error) {
      console.error('❌ Test email failed:', error.message);
      throw error;
    }
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;
