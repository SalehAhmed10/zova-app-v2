/**
 * Payment Setup Email Campaign Service
 * 
 * Handles automated email follow-ups for providers who haven't completed payment setup
 */

import { supabase } from '@/lib/supabase';

interface EmailCampaignData {
  provider_id: string;
  email: string;
  first_name?: string;
  verification_completed_at: string;
  payment_setup_completed: boolean;
  days_since_verification: number;
  last_email_sent?: string;
  email_count: number;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  text_body: string;
  delay_days: number;
  trigger_condition: 'verification_complete' | 'payment_not_setup' | 'nudge_reminder';
}

export class PaymentEmailCampaignService {
  
  /**
   * Email templates for different stages of payment setup follow-up
   */
  private static readonly EMAIL_TEMPLATES: EmailTemplate[] = [
    {
      id: 'payment_setup_day1',
      name: 'Payment Setup Reminder - Day 1',
      subject: '💳 Complete your payment setup to start earning',
      delay_days: 1,
      trigger_condition: 'verification_complete',
      html_body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">You're almost ready to start earning! 💰</h2>
          
          <p>Hi {{first_name}},</p>
          
          <p>Congratulations on completing your provider verification! You're just one step away from start receiving payments from customers.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>⚡ Quick Payment Setup (2-3 minutes)</h3>
            <ul>
              <li>✅ Secure Stripe Connect integration</li>
              <li>✅ Automatic transfers to your bank account</li>
              <li>✅ Industry-leading security</li>
              <li>✅ Support for customers worldwide</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{payment_setup_url}}" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Complete Payment Setup
            </a>
          </div>
          
          <p>Have questions? Reply to this email and we'll help you get set up.</p>
          
          <p>Best regards,<br>The ZOVA Team</p>
        </div>
      `,
      text_body: `Hi {{first_name}},

Congratulations on completing your provider verification! You're just one step away from start receiving payments from customers.

Complete your payment setup in just 2-3 minutes:
- Secure Stripe Connect integration
- Automatic transfers to your bank account
- Industry-leading security
- Support for customers worldwide

Complete Payment Setup: {{payment_setup_url}}

Have questions? Reply to this email and we'll help you get set up.

Best regards,
The ZOVA Team`
    },
    {
      id: 'payment_setup_day3',
      name: 'Payment Setup Reminder - Day 3',
      subject: 'Your clients are waiting! Set up payments now 🚀',
      delay_days: 3,
      trigger_condition: 'payment_not_setup',
      html_body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Don't miss out on earning opportunities! 🚀</h2>
          
          <p>Hi {{first_name}},</p>
          
          <p>We noticed you haven't completed your payment setup yet. Your verification is approved and clients are looking for providers like you!</p>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h3>📊 What you're missing:</h3>
            <ul>
              <li>🏃‍♀️ Clients booking services similar to yours</li>
              <li>💰 Average provider earnings: $1,200/month</li>
              <li>⭐ High customer satisfaction ratings</li>
              <li>📈 Growing demand in your area</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{payment_setup_url}}" style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Start Earning Today
            </a>
          </div>
          
          <p><small>Still have questions? <a href="mailto:support@zova.app">Contact our support team</a> for personalized help.</small></p>
          
          <p>Best regards,<br>The ZOVA Team</p>
        </div>
      `,
      text_body: `Hi {{first_name}},

We noticed you haven't completed your payment setup yet. Your verification is approved and clients are looking for providers like you!

What you're missing:
- Clients booking services similar to yours
- Average provider earnings: $1,200/month
- High customer satisfaction ratings
- Growing demand in your area

Start Earning Today: {{payment_setup_url}}

Still have questions? Contact our support team: support@zova.app

Best regards,
The ZOVA Team`
    },
    {
      id: 'payment_setup_day7',
      name: 'Final Payment Setup Reminder',
      subject: 'Last chance: Complete your payment setup',
      delay_days: 7,
      trigger_condition: 'payment_not_setup',
      html_body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #7c3aed;">We'd hate to see you miss out! 💜</h2>
          
          <p>Hi {{first_name}},</p>
          
          <p>This is our final reminder about completing your payment setup. After this, we'll stop sending payment setup reminders.</p>
          
          <div style="background: #ede9fe; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>🤝 We're here to help!</h3>
            <p>If you're facing any issues or have concerns about payment setup, our team is ready to assist you personally.</p>
            
            <p>Common questions we can help with:</p>
            <ul>
              <li>Security and safety of payment processing</li>
              <li>How fees and transfers work</li>
              <li>Technical support with account setup</li>
              <li>Understanding verification requirements</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{payment_setup_url}}" style="background: #7c3aed; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px;">
              Complete Setup
            </a>
            <a href="mailto:support@zova.app" style="background: #6b7280; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Get Help
            </a>
          </div>
          
          <p>Thank you for choosing ZOVA. We're excited to have you as part of our provider community!</p>
          
          <p>Best regards,<br>The ZOVA Team</p>
        </div>
      `,
      text_body: `Hi {{first_name}},

This is our final reminder about completing your payment setup. After this, we'll stop sending payment setup reminders.

We're here to help! If you're facing any issues or have concerns about payment setup, our team is ready to assist you personally.

Common questions we can help with:
- Security and safety of payment processing
- How fees and transfers work
- Technical support with account setup
- Understanding verification requirements

Complete Setup: {{payment_setup_url}}
Get Help: support@zova.app

Thank you for choosing ZOVA. We're excited to have you as part of our provider community!

Best regards,
The ZOVA Team`
    }
  ];

  /**
   * Queue payment setup follow-up emails for a provider
   */
  static async queuePaymentSetupEmails(providerId: string): Promise<void> {
    try {
      // Get provider information
      const { data: provider, error } = await supabase
        .from('profiles')
        .select('email, first_name, verification_status, stripe_charges_enabled')
        .eq('id', providerId)
        .eq('role', 'provider')
        .single();

      if (error || !provider) {
        console.error('Failed to get provider for email campaign:', error);
        return;
      }

      // Only queue emails if verification is complete but payment not set up
      if (provider.verification_status === 'approved' && !provider.stripe_charges_enabled) {
        for (const template of this.EMAIL_TEMPLATES) {
          await this.scheduleEmail(providerId, template, provider);
        }
      }
    } catch (error) {
      console.error('Failed to queue payment setup emails:', error);
    }
  }

  /**
   * Schedule a specific email template
   */
  private static async scheduleEmail(
    providerId: string,
    template: EmailTemplate,
    provider: any
  ): Promise<void> {
    const sendDate = new Date();
    sendDate.setDate(sendDate.getDate() + template.delay_days);

    const emailData = {
      provider_id: providerId,
      template_id: template.id,
      recipient_email: provider.email,
      scheduled_for: sendDate.toISOString(),
      status: 'scheduled',
      subject: template.subject,
      html_body: this.replaceTemplateVariables(template.html_body, provider, providerId),
      text_body: this.replaceTemplateVariables(template.text_body, provider, providerId),
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('scheduled_emails')
      .insert(emailData);

    if (error) {
      console.error('Failed to schedule email:', error);
    } else {
      console.log(`📧 [Email Campaign] Scheduled ${template.name} for ${provider.email}`);
    }
  }

  /**
   * Replace template variables with actual values
   */
  private static replaceTemplateVariables(
    template: string,
    provider: any,
    providerId: string
  ): string {
    const paymentSetupUrl = `https://your-app-domain.com/provider-verification/payment?provider=${providerId}`;
    
    return template
      .replace(/{{first_name}}/g, provider.first_name || 'there')
      .replace(/{{email}}/g, provider.email)
      .replace(/{{payment_setup_url}}/g, paymentSetupUrl);
  }

  /**
   * Cancel scheduled emails for a provider (when they complete payment setup)
   */
  static async cancelScheduledEmails(providerId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('scheduled_emails')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('provider_id', providerId)
        .eq('status', 'scheduled');

      if (error) {
        console.error('Failed to cancel scheduled emails:', error);
      } else {
        console.log(`📧 [Email Campaign] Cancelled scheduled emails for provider ${providerId}`);
      }
    } catch (error) {
      console.error('Error cancelling scheduled emails:', error);
    }
  }

  /**
   * Process and send scheduled emails (this would typically run on a server cron job)
   */
  static async processScheduledEmails(): Promise<void> {
    try {
      const { data: emails, error } = await supabase
        .from('scheduled_emails')
        .select('*')
        .eq('status', 'scheduled')
        .lte('scheduled_for', new Date().toISOString())
        .limit(50);

      if (error) {
        console.error('Failed to get scheduled emails:', error);
        return;
      }

      for (const email of emails || []) {
        await this.sendEmail(email);
      }
    } catch (error) {
      console.error('Error processing scheduled emails:', error);
    }
  }

  /**
   * Send an individual email
   */
  private static async sendEmail(emailData: any): Promise<void> {
    try {
      // Here you would integrate with your email service (SendGrid, Mailgun, etc.)
      // For now, we'll just update the status
      
      const { error } = await supabase
        .from('scheduled_emails')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', emailData.id);

      if (error) {
        console.error('Failed to update email status:', error);
      } else {
        console.log(`📧 [Email Campaign] Sent ${emailData.template_id} to ${emailData.recipient_email}`);
      }
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }

  /**
   * Get email campaign metrics
   */
  static async getCampaignMetrics(): Promise<{
    total_scheduled: number;
    total_sent: number;
    total_cancelled: number;
    open_rate: number;
    click_rate: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('scheduled_emails')
        .select('status')
        .not('status', 'eq', null);

      if (error) {
        console.error('Failed to get campaign metrics:', error);
        return {
          total_scheduled: 0,
          total_sent: 0,
          total_cancelled: 0,
          open_rate: 0,
          click_rate: 0
        };
      }

      const metrics = {
        total_scheduled: data.filter(email => email.status === 'scheduled').length,
        total_sent: data.filter(email => email.status === 'sent').length,
        total_cancelled: data.filter(email => email.status === 'cancelled').length,
        open_rate: 0, // Would be tracked with email service integration
        click_rate: 0  // Would be tracked with email service integration
      };

      return metrics;
    } catch (error) {
      console.error('Error getting campaign metrics:', error);
      return {
        total_scheduled: 0,
        total_sent: 0,
        total_cancelled: 0,
        open_rate: 0,
        click_rate: 0
      };
    }
  }
}