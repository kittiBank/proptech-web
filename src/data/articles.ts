import type { ArticleCategory, ArticleDetailDto } from "@/types/api";
import { photos } from "./images";

/**
 * Mock guide articles. In production these come from the CMS (E9). Text is
 * placeholder copy written for the layout (see design handoff §8).
 */

export const articleCategories: { value: ArticleCategory; label: string }[] = [
  { value: "buying", label: "ซื้อบ้าน" },
  { value: "renting", label: "เช่า" },
  { value: "selling", label: "ขายและลงประกาศ" },
  { value: "finance", label: "สินเชื่อและภาษี" },
  { value: "location", label: "ทำเลและรถไฟฟ้า" },
  { value: "new-projects", label: "โครงการใหม่" },
];

export const articleCategoryLabels = Object.fromEntries(articleCategories.map((c) => [c.value, c.label])) as Record<
  ArticleCategory,
  string
>;

/** Placeholder until the real LINE OA handle is confirmed. */
export const guidesLineUrl = "https://line.me/R/ti/p/@propertyhub";

const EDITORS = "ทีมบรรณาธิการ PropertyHub";

export const articles: ArticleDetailDto[] = [
  {
    slug: "resale-condo-checklist",
    title: "ซื้อคอนโดมือสอง เช็ก 12 ข้อนี้ก่อนวางมัดจำ",
    excerpt: "จากการดูห้องจริง ตรวจเอกสาร จนถึงวันโอน พร้อมรายการที่พิมพ์ไปใช้ได้",
    category: "buying",
    cover: { src: photos.livingRoom, alt: "ห้องนั่งเล่นคอนโดที่มีแสงธรรมชาติ" },
    coverCaption: "ตรวจห้องตอนกลางวันเพื่อดูแสงและรอยรั่วซึม",
    author: EDITORS,
    reviewedBy: "ตรวจทานโดยทนายความ",
    readingMinutes: 10,
    publishedAt: "2026-11-08",
    updatedAt: "2026-11-12",
    featured: true,
    related: {
      title: "คอนโดมือสองใกล้ BTS พร้อมพงษ์",
      query: { mode: "buy", type: "condo", station: "E5" },
    },
    body: [
      {
        type: "paragraph",
        text: "คอนโดมือสองมักได้ทำเลดีกว่าโครงการใหม่ในราคาเดียวกัน แต่ห้องที่ผ่านการใช้งานมาแล้วก็มีเรื่องที่ต้องเช็กมากกว่า บทความนี้เรียงตามลำดับที่คุณจะเจอจริง ตั้งแต่ก่อนนัดดูห้องไปจนถึงวันโอน",
      },
      { type: "heading", id: "before-viewing", text: "ก่อนนัดดูห้อง" },
      {
        type: "paragraph",
        text: "เทียบราคาต่อตารางเมตรกับห้องอื่นในอาคารเดียวกันก่อน ถ้าถูกกว่าตลาดเกิน 15% ให้ถามเหตุผล อาจเป็นห้องทิศตะวันตก ชั้นต่ำ หรือมีภาระที่ยังไม่บอก",
      },
      {
        type: "list",
        items: [
          "ขอเลขห้องและชั้นเพื่อดูผังอาคาร",
          "ถามค่าส่วนกลางต่อเดือนและเงินกองทุน",
          "ถามว่าผู้ขายเป็นเจ้าของเองหรือเป็นนายหน้า",
        ],
      },
      { type: "heading", id: "viewing-day", text: "วันดูห้องจริง" },
      {
        type: "paragraph",
        text: "เปิดน้ำทุกก๊อกพร้อมกันเพื่อดูแรงดัน ส่องใต้ซิงก์และรอบขอบหน้าต่างหารอยน้ำ ลองเปิดแอร์ทุกตัวอย่างน้อย 10 นาที และถามนิติบุคคลเรื่องค่าส่วนกลางค้างชำระ",
      },
      {
        type: "callout",
        tone: "warning",
        title: "ระวังมิจฉาชีพ",
        text: "อย่าโอนมัดจำก่อนได้ดูห้องจริงและตรวจชื่อในโฉนดให้ตรงกับบัตรประชาชนของผู้ขาย",
      },
      { type: "calculator", price: 9_200_000, downPaymentPct: 10, annualRatePct: 3.2, years: 30 },
      { type: "heading", id: "documents", text: "ตรวจเอกสารและโฉนด" },
      {
        type: "paragraph",
        text: "ขอดูหนังสือกรรมสิทธิ์ห้องชุด (อ.ช.2) ตัวจริง ตรวจว่ามีภาระจำนองกับธนาคารไหม ถ้ามี ให้ตกลงว่าจะปลดจำนองในวันโอนพร้อมกัน",
      },
      {
        type: "callout",
        tone: "tip",
        title: "ขอหนังสือปลอดหนี้",
        text: "ให้ผู้ขายขอหนังสือรับรองการปลอดหนี้ค่าส่วนกลางจากนิติบุคคล กรมที่ดินจะขอเอกสารนี้ในวันโอน",
      },
      { type: "heading", id: "negotiate-deposit", text: "ต่อรองราคาและวางมัดจำ" },
      {
        type: "paragraph",
        text: "ทำสัญญาจะซื้อจะขายทุกครั้งก่อนวางมัดจำ ระบุราคา วันโอน ใครจ่ายค่าธรรมเนียมอะไร และเงื่อนไขคืนมัดจำถ้าธนาคารไม่อนุมัติสินเชื่อ",
      },
      { type: "heading", id: "loan-transfer", text: "ยื่นกู้และวันโอน" },
      {
        type: "paragraph",
        text: "ยื่นกู้อย่างน้อย 2 ธนาคารเพื่อเทียบดอกเบี้ย ธนาคารมักประเมินราคาต่ำกว่าราคาซื้อขาย เตรียมเงินส่วนต่างไว้ด้วย วันโอนให้ตรวจห้องอีกรอบก่อนไปกรมที่ดิน",
      },
    ],
  },
  {
    slug: "yellow-line-condo-value-2026",
    title: "คอนโดติดสายสีเหลือง ราคาไหนยังคุ้ม ปี 2569",
    excerpt: "เทียบราคาต่อตารางเมตรรอบสถานีสายสีเหลือง กับค่าเดินทางเข้าเมืองจริง",
    category: "location",
    cover: { src: photos.bangkokSkyline, alt: "เส้นขอบฟ้ากรุงเทพฯ" },
    author: EDITORS,
    readingMinutes: 8,
    publishedAt: "2026-11-06",
    updatedAt: "2026-11-06",
    featured: false,
    related: { title: "คอนโดราคาไม่เกิน 3 ล้าน", query: { mode: "buy", type: "condo", maxPrice: 3_000_000 } },
    body: [
      {
        type: "paragraph",
        text: "สายสีเหลืองเปิดมาหลายปีแล้ว ราคาคอนโดรอบสถานีเริ่มนิ่ง ทำให้ตอนนี้เป็นช่วงที่เทียบความคุ้มได้ชัดขึ้น",
      },
      { type: "heading", id: "price-per-sqm", text: "ราคาต่อตารางเมตรรอบสถานี" },
      {
        type: "paragraph",
        text: "สถานีใกล้จุดเปลี่ยนสายมีราคาสูงกว่าสถานีปลายสายราว 20–30% แต่ประหยัดเวลาเดินทางได้วันละเกือบชั่วโมง",
      },
      { type: "calculator", price: 2_800_000, downPaymentPct: 10, annualRatePct: 3.5, years: 30 },
      { type: "heading", id: "who-fits", text: "เหมาะกับใคร" },
      {
        type: "paragraph",
        text: "คนที่ทำงานแถวลาดพร้าวหรือบางนาและอยากได้ห้องแรกในงบไม่เกิน 3 ล้าน",
      },
    ],
  },
  {
    slug: "transfer-fees-who-pays",
    title: "ค่าโอน ภาษี และค่าธรรมเนียม ใครจ่ายอะไรบ้าง",
    excerpt: "สรุปค่าใช้จ่ายวันโอนกรรมสิทธิ์ทั้งฝั่งผู้ซื้อและผู้ขาย พร้อมตัวอย่างตัวเลข",
    category: "finance",
    cover: { src: photos.office, alt: "โต๊ะทำงานกับเอกสารสัญญา" },
    author: EDITORS,
    readingMinutes: 6,
    publishedAt: "2026-11-04",
    updatedAt: "2026-11-04",
    featured: false,
    body: [
      {
        type: "paragraph",
        text: "ค่าใช้จ่ายวันโอนมีหลายรายการ ปกติตกลงกันได้ แต่ธรรมเนียมที่ใช้กันบ่อยคือแบ่งค่าโอนคนละครึ่ง",
      },
      { type: "heading", id: "buyer-costs", text: "ฝั่งผู้ซื้อ" },
      { type: "list", items: ["ค่าธรรมเนียมการโอน 2% (มักแบ่งครึ่ง)", "ค่าจดจำนอง 1% ของวงเงินกู้"] },
      { type: "heading", id: "seller-costs", text: "ฝั่งผู้ขาย" },
      {
        type: "list",
        items: ["ภาษีเงินได้หัก ณ ที่จ่าย", "ภาษีธุรกิจเฉพาะ 3.3% หรืออากรแสตมป์ 0.5% แล้วแต่กรณี"],
      },
      {
        type: "callout",
        tone: "tip",
        title: "ตกลงเป็นลายลักษณ์อักษร",
        text: "เขียนในสัญญาจะซื้อจะขายว่าใครจ่ายรายการไหน จะได้ไม่ต้องเถียงกันที่กรมที่ดิน",
      },
    ],
  },
  {
    slug: "condo-lease-9-clauses",
    title: "สัญญาเช่าคอนโด 9 ข้อที่ต้องอ่านก่อนเซ็น",
    excerpt: "เงินประกัน ค่าซ่อม การต่อสัญญา และการคืนห้อง เรื่องที่มักเป็นปัญหาตอนย้ายออก",
    category: "renting",
    cover: { src: photos.bedroom, alt: "ห้องนอนคอนโดตกแต่งพร้อมอยู่" },
    author: EDITORS,
    readingMinutes: 5,
    publishedAt: "2026-11-02",
    updatedAt: "2026-11-02",
    featured: false,
    related: { title: "คอนโดให้เช่าใกล้ BTS อารีย์", query: { mode: "rent", type: "condo", station: "N5" } },
    body: [
      { type: "paragraph", text: "สัญญาเช่ามาตรฐานมักยาวหลายหน้า แต่ข้อที่มีผลกับเงินของคุณจริง ๆ มีไม่กี่ข้อ" },
      { type: "heading", id: "deposit", text: "เงินประกันและการคืนเงิน" },
      { type: "paragraph", text: "ระบุจำนวนเดือน กำหนดวันคืน และรายการที่หักได้ ถ่ายรูปห้องทุกมุมในวันรับห้อง" },
      { type: "heading", id: "repairs", text: "ใครซ่อมอะไร" },
      { type: "paragraph", text: "ของที่เสื่อมตามการใช้งาน เช่น แอร์หรือเครื่องทำน้ำอุ่น ควรเป็นหน้าที่ของผู้ให้เช่า" },
    ],
  },
  {
    slug: "phone-photos-sell-faster",
    title: "ถ่ายรูปห้องด้วยมือถือให้ขายไวขึ้น",
    excerpt: "แสง มุมกล้อง และลำดับรูปที่ทำให้ประกาศได้คนทักมากขึ้น",
    category: "selling",
    cover: { src: photos.brightLiving, alt: "ห้องนั่งเล่นสว่างโล่ง" },
    author: EDITORS,
    readingMinutes: 4,
    publishedAt: "2026-10-30",
    updatedAt: "2026-10-30",
    featured: false,
    body: [
      {
        type: "paragraph",
        text: "ประกาศที่มีรูปครบ 8 รูปขึ้นไปได้ข้อความจากผู้สนใจมากกว่าประกาศที่มีรูปน้อยอย่างชัดเจน",
      },
      { type: "heading", id: "light", text: "แสงคือทุกอย่าง" },
      { type: "paragraph", text: "ถ่ายช่วง 10:00–14:00 เปิดม่านทุกบาน และเปิดไฟทุกดวงแม้เป็นกลางวัน" },
      { type: "heading", id: "order", text: "เรียงรูปให้เหมือนเดินชมห้อง" },
      { type: "paragraph", text: "เริ่มจากรูปที่ดีที่สุดเป็นรูปปก ตามด้วยห้องนั่งเล่น ห้องนอน ครัว ห้องน้ำ และวิว" },
    ],
  },
  {
    slug: "used-house-inspection",
    title: "บ้านมือสอง ตรวจรับอย่างไรไม่ให้โดนซ่อมทีหลัง",
    excerpt: "หลังคา ระบบน้ำ ไฟฟ้า และรอยร้าว จุดที่ช่างตรวจบ้านดูเป็นอย่างแรก",
    category: "buying",
    cover: { src: photos.familyHouse, alt: "บ้านเดี่ยวสองชั้นพร้อมสวน" },
    author: EDITORS,
    readingMinutes: 9,
    publishedAt: "2026-10-27",
    updatedAt: "2026-10-27",
    featured: false,
    related: {
      title: "บ้านเดี่ยวขาย 5–10 ล้าน",
      query: { mode: "buy", type: "house", minPrice: 5_000_000, maxPrice: 10_000_000 },
    },
    body: [
      { type: "paragraph", text: "บ้านมือสองซ่อมได้เกือบทุกอย่าง ปัญหาคือรู้ช้าเกินไปจนต่อรองราคาไม่ทัน" },
      { type: "heading", id: "structure", text: "โครงสร้างและรอยร้าว" },
      { type: "paragraph", text: "รอยร้าวแนวทแยงที่มุมประตูหน้าต่างอาจบอกว่าบ้านทรุดไม่เท่ากัน ควรให้วิศวกรดู" },
      { type: "calculator", price: 6_500_000, downPaymentPct: 20, annualRatePct: 3.5, years: 30 },
      { type: "heading", id: "systems", text: "ระบบน้ำและไฟ" },
      { type: "paragraph", text: "ปิดก๊อกทุกตัวแล้วดูมิเตอร์น้ำ ถ้ายังหมุน แปลว่ามีท่อรั่วที่มองไม่เห็น" },
    ],
  },
  {
    slug: "refinance-after-3-years",
    title: "รีไฟแนนซ์หลัง 3 ปี ประหยัดได้จริงเท่าไร",
    excerpt: "คำนวณส่วนต่างดอกเบี้ยหลังหมดโปร เทียบกับค่าใช้จ่ายในการรีไฟแนนซ์",
    category: "finance",
    cover: { src: photos.cityTowers, alt: "อาคารสำนักงานในย่านธุรกิจ" },
    author: EDITORS,
    readingMinutes: 7,
    publishedAt: "2026-10-22",
    updatedAt: "2026-10-22",
    featured: false,
    body: [
      { type: "paragraph", text: "หลังปีที่ 3 ดอกเบี้ยส่วนใหญ่ลอยตัวขึ้นไป 6–7% การรีไฟแนนซ์จึงช่วยลดค่างวดได้ชัดเจน" },
      { type: "heading", id: "costs", text: "ค่าใช้จ่ายในการรีไฟแนนซ์" },
      { type: "list", items: ["ค่าประเมินราคา", "ค่าจดจำนอง 1%", "ค่าปรับไถ่ถอนก่อนกำหนด ถ้ายังไม่ครบ 3 ปี"] },
      { type: "calculator", price: 4_000_000, downPaymentPct: 0, annualRatePct: 3, years: 27 },
    ],
  },
  {
    slug: "pre-sale-condo-what-to-ask",
    title: "จองคอนโดพรีเซล ถามเซลส์ 7 ข้อนี้ก่อนจ่ายเงินจอง",
    excerpt: "กำหนดเสร็จ เงื่อนไขคืนเงิน และสิ่งที่รวมในราคา คำถามที่เซลส์ไม่ค่อยเล่าเอง",
    category: "new-projects",
    cover: { src: photos.condoBuilding, alt: "อาคารคอนโดที่กำลังก่อสร้าง" },
    author: EDITORS,
    readingMinutes: 6,
    publishedAt: "2026-10-18",
    updatedAt: "2026-10-18",
    featured: false,
    body: [
      { type: "paragraph", text: "ราคาพรีเซลมักถูกกว่าตอนสร้างเสร็จ แต่คุณกำลังซื้อของที่ยังไม่มีอยู่จริง" },
      { type: "heading", id: "completion", text: "กำหนดเสร็จและค่าปรับ" },
      { type: "paragraph", text: "ถามว่าถ้าสร้างเสร็จช้ากว่ากำหนด ผู้พัฒนาจะชดเชยอย่างไร และเขียนไว้ในสัญญาหรือไม่" },
    ],
  },
];
