import prisma from './db';
import bcrypt from 'bcryptjs';
import { startFollowUpWorker } from './follow-up';

const globalDb = globalThis as unknown as {
  __isDbInitialized?: boolean;
  __initPromise?: Promise<void> | null;
  __isHealing?: boolean;
};

export async function healDatabase() {
  if (globalDb.__isHealing) return;
  globalDb.__isHealing = true;
  console.log('[DB Health] Running automatic SQLite self-healing & maintenance...');
  try {
    try {
      await prisma.$queryRawUnsafe(`PRAGMA wal_checkpoint(TRUNCATE);`);
    } catch (_) {}
    try {
      await prisma.$queryRawUnsafe(`REINDEX;`);
    } catch (_) {}
    try {
      await prisma.$queryRawUnsafe(`VACUUM;`);
    } catch (_) {}
    console.log('[DB Health] Database self-healing completed successfully.');
  } catch (healErr) {
    console.error('[DB Health] Healing warning:', healErr);
  } finally {
    globalDb.__isHealing = false;
  }
}

export async function ensureDatabaseReady() {
  if (globalDb.__isDbInitialized) return;
  if (globalDb.__initPromise) return globalDb.__initPromise;

  globalDb.__initPromise = (async () => {
    try {
      // 0. Enable WAL mode & safe concurrency optimizations for SQLite
      try {
        await prisma.$queryRawUnsafe(`PRAGMA journal_mode = WAL;`);
      } catch (_) {}
      try {
        await prisma.$queryRawUnsafe(`PRAGMA busy_timeout = 30000;`);
      } catch (_) {}
      try {
        await prisma.$queryRawUnsafe(`PRAGMA synchronous = NORMAL;`);
      } catch (_) {}
      try {
        await prisma.$queryRawUnsafe(`PRAGMA foreign_keys = ON;`);
      } catch (_) {}

      // 1. Unconditionally ensure ALL tables exist using IF NOT EXISTS DDL
      await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "fullName" TEXT NOT NULL,
        "businessName" TEXT NOT NULL,
        "facebookPageUrl" TEXT,
        "email" TEXT NOT NULL UNIQUE,
        "passwordHash" TEXT NOT NULL,
        "phone" TEXT,
        "avatarUrl" TEXT,
        "role" TEXT NOT NULL DEFAULT 'USER',
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "plan" TEXT NOT NULL DEFAULT 'STARTER',
        "planStatus" TEXT NOT NULL DEFAULT 'INACTIVE',
        "monthlyMessageLimit" INTEGER NOT NULL DEFAULT 500,
        "messagesSentThisMonth" INTEGER NOT NULL DEFAULT 0,
        "planExpiresAt" DATETIME,
        "activePackageId" TEXT,
        "aiChatEnabled" BOOLEAN NOT NULL DEFAULT 1,
        "isBlocked" BOOLEAN NOT NULL DEFAULT 0,
        "registrationIp" TEXT,
        "lastLoginIp" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AiSetting" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "provider" TEXT NOT NULL DEFAULT 'GEMINI',
        "model" TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
        "encryptedApiKey" TEXT,
        "temperature" REAL NOT NULL DEFAULT 0.7,
        "maxTokens" INTEGER NOT NULL DEFAULT 800,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("userId", "provider")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ActivityLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "pageId" TEXT,
        "action" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "metadata" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Package" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "slug" TEXT NOT NULL UNIQUE,
        "description" TEXT,
        "price" REAL NOT NULL DEFAULT 0,
        "durationDays" INTEGER NOT NULL DEFAULT 30,
        "messageLimit" INTEGER NOT NULL DEFAULT 1000,
        "pageLimit" INTEGER NOT NULL DEFAULT 1,
        "productLimit" INTEGER NOT NULL DEFAULT 50,
        "features" TEXT NOT NULL DEFAULT '[]',
        "isPopular" BOOLEAN NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT 1,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PaymentMethod" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL UNIQUE,
        "displayName" TEXT NOT NULL,
        "accountType" TEXT NOT NULL DEFAULT 'PERSONAL',
        "accountNumber" TEXT NOT NULL,
        "instructions" TEXT,
        "qrCodeUrl" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT 1,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PackageOrder" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "orderNumber" TEXT NOT NULL UNIQUE,
        "userId" TEXT NOT NULL,
        "packageId" TEXT NOT NULL,
        "paymentMethodId" TEXT,
        "paymentMethodName" TEXT NOT NULL,
        "amount" REAL NOT NULL,
        "senderNumber" TEXT NOT NULL,
        "transactionId" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "adminNote" TEXT,
        "paymentProofUrl" TEXT,
        "approvedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Page" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "channel" TEXT NOT NULL DEFAULT 'FACEBOOK',
        "channelIdentifier" TEXT,
        "extraConfig" TEXT,
        "facebookPageId" TEXT NOT NULL,
        "pageName" TEXT NOT NULL,
        "pageUsername" TEXT,
        "pageProfileImage" TEXT,
        "pageAccessTokenEncrypted" TEXT NOT NULL,
        "verifyTokenEncrypted" TEXT NOT NULL,
        "webhookUrl" TEXT,
        "webhookStatus" TEXT NOT NULL DEFAULT 'PENDING',
        "connectionStatus" TEXT NOT NULL DEFAULT 'CONNECTED',
        "autoReplyEnabled" BOOLEAN NOT NULL DEFAULT 1,
        "humanHandoffEnabled" BOOLEAN NOT NULL DEFAULT 1,
        "replyLanguage" TEXT NOT NULL DEFAULT 'AUTO',
        "replyStyle" TEXT NOT NULL DEFAULT 'FRIENDLY',
        "aiInstructions" TEXT,
        "productImageReply" BOOLEAN NOT NULL DEFAULT 1,
        "maxImagesPerConversation" INTEGER NOT NULL DEFAULT 2,
        "orderDetection" BOOLEAN NOT NULL DEFAULT 1,
        "voiceProcessing" BOOLEAN NOT NULL DEFAULT 1,
        "imageUnderstanding" BOOLEAN NOT NULL DEFAULT 1,
        "replyDelaySeconds" INTEGER NOT NULL DEFAULT 3,
        "followUpEnabled" BOOLEAN NOT NULL DEFAULT 0,
        "followUpWaitMinutes" INTEGER NOT NULL DEFAULT 30,
        "followUpMessage" TEXT,
        "followUpOnlySeen" BOOLEAN NOT NULL DEFAULT 1,
        "followUpMaxCount" INTEGER NOT NULL DEFAULT 1,
        "followUpFrequency" TEXT NOT NULL DEFAULT 'ONCE',
        "followUpIntervalHours" INTEGER NOT NULL DEFAULT 24,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("userId", "facebookPageId")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Product" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "pageId" TEXT,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "sku" TEXT,
        "category" TEXT,
        "price" REAL NOT NULL,
        "discountPrice" REAL,
        "stockQuantity" INTEGER NOT NULL DEFAULT 0,
        "stockStatus" TEXT NOT NULL DEFAULT 'IN_STOCK',
        "imageUrl" TEXT,
        "deliveryInfo" TEXT,
        "productAiInstructions" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT 1,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Conversation" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "pageId" TEXT NOT NULL,
        "channel" TEXT NOT NULL DEFAULT 'FACEBOOK',
        "senderPsid" TEXT NOT NULL,
        "customerName" TEXT,
        "lastMessage" TEXT,
        "lastMessageAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "aiEnabled" BOOLEAN NOT NULL DEFAULT 1,
        "unreadCount" INTEGER NOT NULL DEFAULT 0,
        "imagesSentCount" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("pageId", "senderPsid")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Message" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "conversationId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "pageId" TEXT NOT NULL,
        "senderPsid" TEXT NOT NULL,
        "direction" TEXT NOT NULL,
        "messageType" TEXT NOT NULL DEFAULT 'TEXT',
        "messageText" TEXT,
        "mediaUrl" TEXT,
        "transcription" TEXT,
        "aiGenerated" BOOLEAN NOT NULL DEFAULT 0,
        "aiModel" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Order" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "pageId" TEXT NOT NULL,
        "conversationId" TEXT,
        "customerName" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "address" TEXT NOT NULL,
        "product" TEXT NOT NULL,
        "productId" TEXT,
        "quantity" INTEGER NOT NULL DEFAULT 1,
        "price" REAL NOT NULL DEFAULT 0,
        "totalPrice" REAL NOT NULL DEFAULT 0,
        "notes" TEXT,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "source" TEXT NOT NULL DEFAULT 'MESSENGER_AI',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SystemSetting" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "key" TEXT NOT NULL UNIQUE,
        "value" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "LicenseKey" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "key" TEXT NOT NULL UNIQUE,
        "plan" TEXT NOT NULL DEFAULT 'STARTER',
        "packageId" TEXT,
        "durationDays" INTEGER NOT NULL DEFAULT 30,
        "messageLimit" INTEGER NOT NULL DEFAULT 1000,
        "pageLimit" INTEGER NOT NULL DEFAULT 1,
        "productLimit" INTEGER NOT NULL DEFAULT 50,
        "clientName" TEXT,
        "clientPhone" TEXT,
        "clientNote" TEXT,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "usedByUserId" TEXT,
        "usedAt" DATETIME,
        "expiresAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "FollowUpScheduleStep" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT,
        "pageId" TEXT,
        "stepNumber" INTEGER NOT NULL DEFAULT 1,
        "dayOffset" INTEGER NOT NULL DEFAULT 1,
        "timeOfDay" TEXT NOT NULL DEFAULT '10:00',
        "title" TEXT NOT NULL,
        "guidelinePrompt" TEXT,
        "isEnabled" BOOLEAN NOT NULL DEFAULT 1,
        "isGlobalDefault" BOOLEAN NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "FollowUpLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "pageId" TEXT NOT NULL,
        "conversationId" TEXT NOT NULL,
        "stepNumber" INTEGER NOT NULL DEFAULT 1,
        "dayOffset" INTEGER NOT NULL DEFAULT 1,
        "scheduledTime" TEXT,
        "messageText" TEXT NOT NULL,
        "channel" TEXT NOT NULL DEFAULT 'FACEBOOK',
        "customerName" TEXT,
        "senderPsid" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'SENT',
        "aiModel" TEXT,
        "responseReceivedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "IpBlockList" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "ipAddress" TEXT NOT NULL UNIQUE,
        "reason" TEXT,
        "blockedBy" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Performance Indexes for ultra-fast queries and zero table-scans
    try {
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_ipblock_ip" ON "IpBlockList"("ipAddress");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_user_aichat" ON "User"("aiChatEnabled");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_user_blocked" ON "User"("isBlocked");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_user_reg_ip" ON "User"("registrationIp");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_user_login_ip" ON "User"("lastLoginIp");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_conversation_user" ON "Conversation"("userId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_conversation_page" ON "Conversation"("pageId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_conversation_status" ON "Conversation"("followUpStatus");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_conversation_due" ON "Conversation"("nextFollowUpDueAt");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_conversation_user_status" ON "Conversation"("userId", "followUpStatus");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_conversation_user_created" ON "Conversation"("userId", "createdAt");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_conversation_last_msg" ON "Conversation"("lastMessageAt");`);

      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_message_user" ON "Message"("userId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_message_conv" ON "Message"("conversationId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_message_page" ON "Message"("pageId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_message_created" ON "Message"("createdAt");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_message_user_created" ON "Message"("userId", "createdAt");`);

      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_order_user" ON "Order"("userId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_order_page" ON "Order"("pageId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_order_status" ON "Order"("status");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_order_created" ON "Order"("createdAt");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_order_user_created" ON "Order"("userId", "createdAt");`);

      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_followuplog_user" ON "FollowUpLog"("userId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_followuplog_page" ON "FollowUpLog"("pageId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_followuplog_conv" ON "FollowUpLog"("conversationId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_followuplog_status" ON "FollowUpLog"("status");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_followuplog_created" ON "FollowUpLog"("createdAt");`);

      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_step_user_page" ON "FollowUpScheduleStep"("userId", "pageId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_step_global" ON "FollowUpScheduleStep"("isGlobalDefault");`);
    } catch (_) {}

    // Self-healing migration for multi-channel support with column pre-check
    try {
      const pageColumnsRaw = (await prisma.$queryRawUnsafe(`PRAGMA table_info("Page");`)) as Array<{ name: string }>;
      const existingPageCols = new Set(pageColumnsRaw.map((c) => c.name));

      if (!existingPageCols.has('channel')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Page" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'FACEBOOK';`);
      }
      if (!existingPageCols.has('channelIdentifier')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Page" ADD COLUMN "channelIdentifier" TEXT;`);
      }
      if (!existingPageCols.has('extraConfig')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Page" ADD COLUMN "extraConfig" TEXT;`);
      }
      if (!existingPageCols.has('replyDelaySeconds')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Page" ADD COLUMN "replyDelaySeconds" INTEGER NOT NULL DEFAULT 3;`);
      }
      if (!existingPageCols.has('aiInstructions')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Page" ADD COLUMN "aiInstructions" TEXT;`);
      }
      if (!existingPageCols.has('followUpEnabled')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Page" ADD COLUMN "followUpEnabled" BOOLEAN NOT NULL DEFAULT 0;`);
      }
      if (!existingPageCols.has('followUpWaitMinutes')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Page" ADD COLUMN "followUpWaitMinutes" INTEGER NOT NULL DEFAULT 30;`);
      }
      if (!existingPageCols.has('followUpMessage')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Page" ADD COLUMN "followUpMessage" TEXT;`);
      }
      if (!existingPageCols.has('followUpOnlySeen')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Page" ADD COLUMN "followUpOnlySeen" BOOLEAN NOT NULL DEFAULT 1;`);
      }
      if (!existingPageCols.has('followUpMaxCount')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Page" ADD COLUMN "followUpMaxCount" INTEGER NOT NULL DEFAULT 1;`);
      }
      if (!existingPageCols.has('followUpFrequency')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Page" ADD COLUMN "followUpFrequency" TEXT NOT NULL DEFAULT 'ONCE';`);
      }
      if (!existingPageCols.has('followUpIntervalHours')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Page" ADD COLUMN "followUpIntervalHours" INTEGER NOT NULL DEFAULT 24;`);
      }
      if (!existingPageCols.has('maxImagesPerConversation')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Page" ADD COLUMN "maxImagesPerConversation" INTEGER NOT NULL DEFAULT 2;`);
      }
      if (!existingPageCols.has('maxImagesPerReply')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Page" ADD COLUMN "maxImagesPerReply" INTEGER NOT NULL DEFAULT 1;`);
      }

      // Check User table for missing columns
      try {
        const userColumnsRaw = (await prisma.$queryRawUnsafe(`PRAGMA table_info("User");`)) as Array<{ name: string }>;
        const existingUserCols = new Set(userColumnsRaw.map((c) => c.name));

        if (!existingUserCols.has('activePackageId')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "activePackageId" TEXT;`);
        }
        if (!existingUserCols.has('avatarUrl')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;`);
        }
        if (!existingUserCols.has('facebookPageUrl')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "facebookPageUrl" TEXT;`);
        }
        if (!existingUserCols.has('phone')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "phone" TEXT;`);
        }
        if (!existingUserCols.has('planStatus')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "planStatus" TEXT NOT NULL DEFAULT 'INACTIVE';`);
        }
        if (!existingUserCols.has('monthlyMessageLimit')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "monthlyMessageLimit" INTEGER NOT NULL DEFAULT 500;`);
        }
        if (!existingUserCols.has('messagesSentThisMonth')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "messagesSentThisMonth" INTEGER NOT NULL DEFAULT 0;`);
        }
        if (!existingUserCols.has('planExpiresAt')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "planExpiresAt" DATETIME;`);
        }
        if (!existingUserCols.has('aiChatEnabled')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "aiChatEnabled" BOOLEAN NOT NULL DEFAULT 1;`);
        }
        if (!existingUserCols.has('isBlocked')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "isBlocked" BOOLEAN NOT NULL DEFAULT 0;`);
        }
        if (!existingUserCols.has('registrationIp')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "registrationIp" TEXT;`);
        }
        if (!existingUserCols.has('lastLoginIp')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "lastLoginIp" TEXT;`);
        }
      } catch (_) {}

      // Check Product table for multi-image column & details
      try {
        const prodColumnsRaw = (await prisma.$queryRawUnsafe(`PRAGMA table_info("Product");`)) as Array<{ name: string }>;
        const existingProdCols = new Set(prodColumnsRaw.map((c) => c.name));
        if (!existingProdCols.has('images')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN "images" TEXT;`);
        }
        if (!existingProdCols.has('sku')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN "sku" TEXT;`);
        }
        if (!existingProdCols.has('category')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN "category" TEXT;`);
        }
        if (!existingProdCols.has('discountPrice')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN "discountPrice" REAL;`);
        }
        if (!existingProdCols.has('deliveryInfo')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN "deliveryInfo" TEXT;`);
        }
        if (!existingProdCols.has('productAiInstructions')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN "productAiInstructions" TEXT;`);
        }
      } catch (_) {}

      // Check Order table for missing columns
      try {
        const orderColumnsRaw = (await prisma.$queryRawUnsafe(`PRAGMA table_info("Order");`)) as Array<{ name: string }>;
        const existingOrderCols = new Set(orderColumnsRaw.map((c) => c.name));
        if (!existingOrderCols.has('productId')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN "productId" TEXT;`);
        }
        if (!existingOrderCols.has('price')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN "price" REAL NOT NULL DEFAULT 0;`);
        }
        if (!existingOrderCols.has('totalPrice')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN "totalPrice" REAL NOT NULL DEFAULT 0;`);
        }
        if (!existingOrderCols.has('source')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'MESSENGER_AI';`);
        }
        if (!existingOrderCols.has('notes')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN "notes" TEXT;`);
        }
        if (!existingOrderCols.has('quantity')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;`);
        }
      } catch (_) {}

      // Check PackageOrder table for missing columns
      try {
        const poColumnsRaw = (await prisma.$queryRawUnsafe(`PRAGMA table_info("PackageOrder");`)) as Array<{ name: string }>;
        const existingPoCols = new Set(poColumnsRaw.map((c) => c.name));
        if (!existingPoCols.has('paymentMethodId')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "PackageOrder" ADD COLUMN "paymentMethodId" TEXT;`);
        }
        if (!existingPoCols.has('paymentProofUrl')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "PackageOrder" ADD COLUMN "paymentProofUrl" TEXT;`);
        }
        if (!existingPoCols.has('approvedAt')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "PackageOrder" ADD COLUMN "approvedAt" DATETIME;`);
        }
        if (!existingPoCols.has('adminNote')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "PackageOrder" ADD COLUMN "adminNote" TEXT;`);
        }
      } catch (_) {}

      // Check LicenseKey table for missing columns
      try {
        const licColumnsRaw = (await prisma.$queryRawUnsafe(`PRAGMA table_info("LicenseKey");`)) as Array<{ name: string }>;
        const existingLicCols = new Set(licColumnsRaw.map((c) => c.name));
        if (!existingLicCols.has('packageId')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "LicenseKey" ADD COLUMN "packageId" TEXT;`);
        }
        if (!existingLicCols.has('clientName')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "LicenseKey" ADD COLUMN "clientName" TEXT;`);
        }
        if (!existingLicCols.has('clientPhone')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "LicenseKey" ADD COLUMN "clientPhone" TEXT;`);
        }
        if (!existingLicCols.has('clientNote')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "LicenseKey" ADD COLUMN "clientNote" TEXT;`);
        }
      } catch (_) {}

      const convColumnsRaw = (await prisma.$queryRawUnsafe(`PRAGMA table_info("Conversation");`)) as Array<{ name: string }>;
      const existingConvCols = new Set(convColumnsRaw.map((c) => c.name));

      if (!existingConvCols.has('imagesSentCount')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Conversation" ADD COLUMN "imagesSentCount" INTEGER NOT NULL DEFAULT 0;`);
      }
      if (!existingConvCols.has('channel')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Conversation" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'FACEBOOK';`);
      }
      if (!existingConvCols.has('lastSeenAt')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Conversation" ADD COLUMN "lastSeenAt" DATETIME;`);
      }
      if (!existingConvCols.has('lastFollowUpSentAt')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Conversation" ADD COLUMN "lastFollowUpSentAt" DATETIME;`);
      }
      if (!existingConvCols.has('followUpSentCount')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Conversation" ADD COLUMN "followUpSentCount" INTEGER NOT NULL DEFAULT 0;`);
      }
      if (!existingConvCols.has('followUpStatus')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Conversation" ADD COLUMN "followUpStatus" TEXT NOT NULL DEFAULT 'IDLE';`);
      }
      if (!existingConvCols.has('currentFollowUpStep')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Conversation" ADD COLUMN "currentFollowUpStep" INTEGER NOT NULL DEFAULT 0;`);
      }
      if (!existingConvCols.has('nextFollowUpDueAt')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Conversation" ADD COLUMN "nextFollowUpDueAt" DATETIME;`);
      }

      // Ensure null connectionStatus defaults to PENDING
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "Page" SET "connectionStatus" = 'PENDING' WHERE "connectionStatus" IS NULL;`
        );
      } catch (_) {}
    } catch (migrationErr) {
      console.warn('Migration pre-check warning:', migrationErr);
    }
  } catch (ddlErr) {
    console.warn('Raw table creation note:', ddlErr);
  }

  try {
    // 2. Seed default Admin account if not present
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { role: 'ADMIN' },
          { email: 'admin@replyx.ai' },
          { email: 'admin@gmail.com' },
        ],
      },
    });

    if (!existingAdmin) {
      const defaultPasswordHash = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          id: 'usr_admin_default',
          fullName: 'Super Admin',
          businessName: 'ReplyX AI Platform',
          email: 'admin@replyx.ai',
          passwordHash: defaultPasswordHash,
          role: 'ADMIN',
          status: 'ACTIVE',
          plan: 'PRO',
          planStatus: 'ACTIVE',
          monthlyMessageLimit: 999999,
        },
      });
    }

    // 3. Seed default packages if empty
    const pkgCount = await prisma.package.count();
    if (pkgCount === 0) {
      await prisma.package.createMany({
        data: [
          {
            id: 'pkg_starter',
            name: 'স্টার্টার প্যাকেজ',
            slug: 'starter',
            description: 'ছোট ব্যবসার জন্য আদর্শ AI অটোমেশন প্যাকেজ',
            price: 990,
            durationDays: 30,
            messageLimit: 1000,
            pageLimit: 1,
            productLimit: 50,
            features: JSON.stringify(['১টি ফেসবুক পেজ অটোমেশন', '১,০০০ চ্যাট অটো-রিপ্লাই', 'বাংলা ও ইংলিশ এআই রিপ্লাই', 'অর্ডার নেওয়ার সুবিধা']),
            isPopular: false,
            isActive: true,
          },
          {
            id: 'pkg_business',
            name: 'বিজনেস প্যাকেজ',
            slug: 'business',
            description: 'মাঝারি সাইজের পেজের জন্য সবচেয়ে জনপ্রিয় প্যাকেজ',
            price: 1990,
            durationDays: 30,
            messageLimit: 3000,
            pageLimit: 3,
            productLimit: 200,
            features: JSON.stringify(['৩টি ফেসবুক পেজ সংযোগ', '৩,০০০ চ্যাট অটো-রিপ্লাই', 'প্রোডাক্ট ছবি দেখে ছবিসহ উত্তর', 'মেসেঞ্জারে অটোমেটিক অর্ডার']),
            isPopular: true,
            isActive: true,
          },
          {
            id: 'pkg_pro',
            name: 'প্রো প্যাকেজ',
            slug: 'pro',
            description: 'বড় ই-কমার্স পেজের জন্য আনলিমিটেড স্কেলিং প্যাকেজ',
            price: 3490,
            durationDays: 30,
            messageLimit: 10000,
            pageLimit: 10,
            productLimit: 1000,
            features: JSON.stringify(['১০টি ফেসবুক পেজ কানেকশন', '১০,০০০ চ্যাট অটো-রিপ্লাই', 'ভয়েস ও টেক্সট দুই চ্যাটেই রিপ্লাই', 'প্রাইওরিটি কাস্টমার সাপোর্ট']),
            isPopular: false,
            isActive: true,
          },
        ],
      });
    }

    // 4. Seed default Payment Methods if empty
    const pmCount = await prisma.paymentMethod.count();
    if (pmCount === 0) {
      await prisma.paymentMethod.createMany({
        data: [
          {
            id: 'pm_bkash',
            name: 'BKASH',
            displayName: 'bKash (বিকাশ)',
            accountType: 'PERSONAL',
            accountNumber: '01800000000',
            instructions: 'Send Money করুন এবং নিচে ট্রানজেকশন আইডি (TrxID) দিন।',
            isActive: true,
          },
          {
            id: 'pm_nagad',
            name: 'NAGAD',
            displayName: 'Nagad (নগদ)',
            accountType: 'PERSONAL',
            accountNumber: '01700000000',
            instructions: 'Send Money করুন এবং নিচে ট্রানজেকশন আইডি (TrxID) দিন।',
            isActive: true,
          },
          {
            id: 'pm_rocket',
            name: 'ROCKET',
            displayName: 'Rocket (রকেট)',
            accountType: 'PERSONAL',
            accountNumber: '01900000000',
            instructions: 'Send Money করুন এবং নিচে ট্রানজেকশন আইডি দিন।',
            isActive: true,
          },
        ],
      });
    }

    // 5. Seed default FollowUpScheduleSteps if empty
    const stepCount = await prisma.followUpScheduleStep.count({
      where: { isGlobalDefault: true },
    });
    if (stepCount === 0) {
      await prisma.followUpScheduleStep.createMany({
        data: [
          {
            stepNumber: 1,
            dayOffset: 1,
            timeOfDay: '10:00',
            title: '১ম ফলো-আপ (১ দিন পর - সকাল ১০টা)',
            guidelinePrompt: 'পছন্দের পণ্য নিয়ে কোনো জিজ্ঞাসা আছে কিনা বা অর্ডার কনফার্ম করতে কোনো সহায়তা প্রয়োজন কিনা তা অত্যন্ত আন্তরিক ও বিনম্রভাবে জানতে চান।',
            isEnabled: true,
            isGlobalDefault: true,
          },
          {
            stepNumber: 2,
            dayOffset: 3,
            timeOfDay: '16:00',
            title: '২য় ফলো-আপ (৩ দিন পর - বিকাল ৪টা)',
            guidelinePrompt: 'পণ্যের প্রিমিয়াম কোয়ালিটি ও ক্যাশ অন ডেলিভারি (COD) সুবিধার কথা মনে করিয়ে দিয়ে অর্ডার কনফার্ম করার সহজ প্রক্রিয়া জানান।',
            isEnabled: true,
            isGlobalDefault: true,
          },
          {
            stepNumber: 3,
            dayOffset: 7,
            timeOfDay: '20:00',
            title: '৩য় ফলো-আপ (৭ দিন পর - রাত ৮টা)',
            guidelinePrompt: 'স্টক লিমিটেড হতে পারে বা দ্রুত ডেলিভারি সার্ভিসের বন্ধুত্বপূর্ণ রিমাইন্ডার দিন। আগের মেসেজের কথা সরাসরি পুনরাবৃত্তি করবেন না।',
            isEnabled: true,
            isGlobalDefault: true,
          },
          {
            stepNumber: 4,
            dayOffset: 15,
            timeOfDay: '11:00',
            title: '৪র্থ ফলো-আপ (১৫ দিন পর - সকাল ১১টা)',
            guidelinePrompt: 'কোনো বিশেষ ছাড় বা পছন্দের অন্য কোনো পণ্য দেখতে চান কিনা অথবা কোনো ফিডব্যাক আছে কিনা জানতে চান।',
            isEnabled: true,
            isGlobalDefault: true,
          },
          {
            stepNumber: 5,
            dayOffset: 25,
            timeOfDay: '17:00',
            title: '৫ম ফলো-আপ (২৫ দিন পর - বিকাল ৫টা)',
            guidelinePrompt: 'মাসের সমাপনী আন্তরিক সম্ভাষণ জানান এবং ভবিষ্যতে যেকোনো পণ্য বা সেবার জন্য যোগাযোগ করতে আমন্ত্রণ জানান।',
            isEnabled: true,
            isGlobalDefault: true,
          },
        ],
      });
    }

    globalDb.__isDbInitialized = true;
    try {
      startFollowUpWorker();
    } catch (_) {}
  } catch (err: any) {
    console.error('Error during database self-healing initialization:', err);
    if (String(err?.message || '').includes('malformed') || String(err?.message || '').includes('SqliteError')) {
      await healDatabase();
    }
  } finally {
    globalDb.__initPromise = null;
  }
  })();

  return globalDb.__initPromise;
}

