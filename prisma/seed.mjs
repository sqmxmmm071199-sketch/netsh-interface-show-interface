import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanExistingSeedData(email) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { workspaces: { select: { id: true } } },
  });

  if (!user) return;

  const workspaceIds = user.workspaces.map((workspace) => workspace.id);

  if (workspaceIds.length > 0) {
    await prisma.contentCalendarItem.deleteMany({
      where: { workspaceId: { in: workspaceIds } },
    });
    await prisma.generatedContent.deleteMany({
      where: { workspaceId: { in: workspaceIds } },
    });
    await prisma.asset.deleteMany({
      where: { workspaceId: { in: workspaceIds } },
    });
    await prisma.assetBatch.deleteMany({
      where: { workspaceId: { in: workspaceIds } },
    });
    await prisma.brandMemory.deleteMany({
      where: { workspaceId: { in: workspaceIds } },
    });
    await prisma.brandProfile.deleteMany({
      where: { workspaceId: { in: workspaceIds } },
    });
    await prisma.workspace.deleteMany({
      where: { id: { in: workspaceIds } },
    });
  }

  await prisma.user.delete({ where: { email } });
}

async function main() {
  const seedEmail = "mia@yunque.example";
  await cleanExistingSeedData(seedEmail);

  const user = await prisma.user.create({
    data: {
      email: seedEmail,
      name: "Mia Chen",
      avatarUrl: "https://example.com/avatars/mia.png",
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: "青柠生活馆",
      slug: "qingning-life",
      ownerId: user.id,
    },
  });

  await prisma.brandProfile.create({
    data: {
      workspaceId: workspace.id,
      brandName: "青柠生活馆",
      websiteUrl: "https://qingning.example",
      storeUrl: "https://shop.qingning.example",
      industry: "轻饮品 / 电商品牌",
      productDescription:
        "冷萃茶便携装，主打低糖、清爽、东方茶感和随手携带，适合夏季通勤、办公室和轻负担饮品场景。",
      targetAudience:
        "25-35 岁城市白领，关注饮品成分和热量，偏好真实生活方式内容的独立站消费者。",
      brandTone: "清爽，可信，轻松，克制，专业",
      brandKeywords: ["低糖", "通勤", "东方茶感", "轻负担", "冷萃茶"],
      tagline: "面向年轻通勤人群的轻负担饮品品牌",
      description:
        "主打低糖、清爽、东方茶感和随手携带，内容表达真实克制，适合小红书、Instagram 和 TikTok 多平台运营。",
      toneKeywords: ["清爽", "可信", "轻松", "克制", "专业"],
      targetAudiences: [
        "25-35 岁城市白领",
        "关注饮品成分和热量的人群",
        "偏好真实生活方式内容的独立站消费者",
      ],
      forbiddenWords: ["减肥神器", "治愈焦虑", "零负担", "永久有效"],
      competitorLinks: [
        "https://competitor-a.example",
        "https://competitor-b.example",
      ],
      platformPreferences: [
        "小红书：真实体验、标题直接、图文种草",
        "Instagram：简洁英文、生活方式视觉、轮播说明",
        "TikTok：前三秒强钩子、场景反差、短脚本",
      ],
      brandSummary:
        "青柠生活馆是面向年轻通勤人群的轻负担饮品品牌，适合围绕清爽、低糖、东方茶感和便携场景建立内容资产。",
      targetAudienceSummary:
        "核心用户是关注饮品成分、热量和日常体验的 25-35 岁城市白领。",
      toneOfVoice: ["清爽", "可信", "轻松", "克制"],
      contentAngles: ["夏季通勤补水", "下午三点低糖选择", "办公室轻饮品搭配"],
      forbiddenClaims: ["减肥神器", "治愈焦虑", "永久有效"],
      recommendedPlatforms: ["小红书", "Instagram", "TikTok"],
      marketingSuggestions: [
        "优先把通勤场景素材做成小红书图文种草。",
        "将低糖和东方茶感拆成 Instagram 轮播内容。",
        "用开箱视频测试 TikTok 前三秒钩子。",
      ],
      aiAnalysisUpdatedAt: new Date(),
    },
  });

  const batch = await prisma.assetBatch.create({
    data: {
      workspaceId: workspace.id,
      name: "夏季通勤主题素材",
      description: "冷萃茶新品在通勤、办公室和便利店场景下的素材批次。",
      source: "local_mock_storage",
    },
  });

  const productImage = await prisma.asset.create({
    data: {
      workspaceId: workspace.id,
      batchId: batch.id,
      type: "IMAGE",
      status: "UNUSED",
      title: "冷萃茶白底主图",
      description: "适合电商详情页和轮播首图。",
      url: "/mock-assets/cold-brew-main.png",
      fileName: "冷萃茶白底主图.png",
      fileType: "image/png",
      fileUrl: "/mock-assets/cold-brew-main.png",
      thumbnailUrl: "/mock-assets/cold-brew-main.png",
      usageStatus: "UNUSED",
      aiDescription: "白底产品主图，适合用于电商详情页、Instagram 轮播首图和新品介绍内容。",
      productName: "低糖冷萃茶",
      scene: "产品白底图",
      visualStyle: "干净白底、商品详情页风格",
      suggestedUse: "电商详情页、轮播首图、产品卖点拆解",
      recommendedPlatforms: ["Instagram", "小红书"],
      mimeType: "image/png",
      sizeBytes: 820000,
      tags: ["产品图", "主推", "电商"],
      metadata: {
        width: 1600,
        height: 1200,
      },
    },
  });

  const commuteScene = await prisma.asset.create({
    data: {
      workspaceId: workspace.id,
      batchId: batch.id,
      type: "IMAGE",
      status: "USED",
      title: "地铁通勤场景照",
      description: "适合小红书封面和 Instagram 轮播。",
      url: "/mock-assets/commute-scene.jpg",
      fileName: "地铁通勤场景照.jpg",
      fileType: "image/jpeg",
      fileUrl: "/mock-assets/commute-scene.jpg",
      thumbnailUrl: "/mock-assets/commute-scene.jpg",
      usageStatus: "USED",
      aiDescription: "地铁通勤场景中的生活方式素材，适合表达随手携带、夏季清爽和上班族日常。",
      productName: "低糖冷萃茶",
      scene: "地铁通勤",
      visualStyle: "真实生活方式、自然光、轻松日常",
      suggestedUse: "小红书封面、Instagram 生活方式轮播",
      recommendedPlatforms: ["小红书", "Instagram"],
      mimeType: "image/jpeg",
      sizeBytes: 1240000,
      tags: ["场景图", "夏季", "通勤"],
    },
  });

  const unboxingVideo = await prisma.asset.create({
    data: {
      workspaceId: workspace.id,
      batchId: batch.id,
      type: "VIDEO",
      status: "UNUSED",
      title: "15 秒开箱视频",
      description: "适合 TikTok 短视频脚本二创。",
      url: "/mock-assets/unboxing.mp4",
      fileName: "15 秒开箱视频.mp4",
      fileType: "video/mp4",
      fileUrl: "/mock-assets/unboxing.mp4",
      thumbnailUrl: null,
      usageStatus: "UNUSED",
      aiDescription: "短视频开箱素材，可用于测试前三秒钩子、包装展示和产品上手节奏。",
      productName: "低糖冷萃茶",
      scene: "开箱",
      visualStyle: "短视频开箱、快节奏、近景展示",
      suggestedUse: "TikTok 短视频、Reels 开箱脚本",
      recommendedPlatforms: ["TikTok", "Instagram"],
      mimeType: "video/mp4",
      sizeBytes: 6200000,
      tags: ["短视频", "开箱", "TikTok"],
    },
  });

  const generatedContent = await prisma.generatedContent.create({
    data: {
      workspaceId: workspace.id,
      title: "夏季通勤冷萃茶种草",
      type: "POST",
      status: "DRAFT",
      platforms: ["XIAOHONGSHU", "INSTAGRAM"],
      prompt: "围绕夏季通勤场景，突出低糖、清爽和随手携带。",
      brief: "新品冷萃茶便携装的多平台种草内容。",
      body:
        "下午三点不想再喝甜腻饮料，可以试试这瓶冷萃茶便携装。低糖、清爽、茶感干净，放进通勤包里也不占位置。",
      hashtags: ["夏日通勤", "低糖饮品", "冷萃茶"],
      callToAction: "收藏这份通勤饮品清单",
      model: "mock",
      assets: {
        connect: [{ id: productImage.id }, { id: commuteScene.id }],
      },
    },
  });

  await prisma.generatedContent.create({
    data: {
      workspaceId: workspace.id,
      title: "15 秒开箱短视频脚本",
      type: "SHORT_VIDEO_SCRIPT",
      status: "DRAFT",
      platforms: ["TIKTOK"],
      prompt: "生成一个适合 TikTok 的短视频开箱脚本。",
      brief: "强调前三秒钩子和通勤场景反差。",
      body:
        "镜头 1：地铁口出汗。镜头 2：从包里拿出冷萃茶。镜头 3：打开、喝一口、切到清爽办公状态。",
      hashtags: ["commuteroutine", "drinktok", "summer"],
      callToAction: "试试这个开场模板",
      model: "mock",
      assets: {
        connect: [{ id: unboxingVideo.id }],
      },
    },
  });

  await prisma.contentCalendarItem.create({
    data: {
      workspaceId: workspace.id,
      generatedContentId: generatedContent.id,
      title: "夏季通勤冷萃茶种草",
      description: "发布小红书图文种草，复用产品主图和通勤场景照。",
      platform: "XIAOHONGSHU",
      contentType: "POST",
      status: "SCHEDULED",
      scheduledAt: new Date("2026-06-17T10:30:00+08:00"),
      ownerName: "Mia",
      notes: "发布前检查禁用词和封面标题。",
    },
  });

  await prisma.contentCalendarItem.create({
    data: {
      workspaceId: workspace.id,
      title: "低糖配方卖点轮播",
      description: "Instagram 轮播内容，强调清爽、低糖和东方茶感。",
      platform: "INSTAGRAM",
      contentType: "CAROUSEL",
      status: "DRAFT",
      scheduledAt: new Date("2026-06-19T18:00:00+08:00"),
      ownerName: "Leo",
    },
  });

  await prisma.brandMemory.createMany({
    data: [
      {
        workspaceId: workspace.id,
        type: "PREFERENCE",
        title: "内容语气偏好",
        content: "文案应像朋友分享日常好物，避免强销售话术。",
        source: "seed",
        importance: 8,
        tags: ["tone", "copywriting"],
        priority: 8,
      },
      {
        workspaceId: workspace.id,
        type: "BRAND_RULE",
        title: "核心卖点表达",
        content: "优先表达低糖、清爽、东方茶感和便携，不承诺功效。",
        source: "seed",
        importance: 10,
        tags: ["selling-points", "brand"],
        priority: 10,
      },
      {
        workspaceId: workspace.id,
        type: "COMPLIANCE_RULE",
        title: "禁用夸大功效",
        content: "不要使用减肥、治愈、永久有效等暗示医疗或极限效果的表达。",
        source: "seed",
        importance: 10,
        tags: ["compliance", "forbidden-words"],
        priority: 10,
      },
    ],
  });

  console.log(`Seed complete: ${user.email} / ${workspace.slug}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
