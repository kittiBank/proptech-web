import type { AdPlacement } from "@/types/api";
import type { Advertisement } from "@/types/property";
import { photos } from "./images";

/** Mock sponsored banners. Advertisers are fictional. */
export const advertisements: Record<AdPlacement, Advertisement[]> = {
  "home-feed": [
    {
      id: "ad-01",
      sponsor: "ธนาคารบ้านดี",
      title: "สินเชื่อบ้านดอกเบี้ยเริ่ม 2.89% ปีแรก",
      description: "อนุมัติเบื้องต้นออนไลน์ใน 1 วัน ผ่อนนานสูงสุด 40 ปี ไม่มีค่าธรรมเนียมประเมินราคา",
      ctaLabel: "เช็กวงเงินกู้",
      href: "/advertise?campaign=home-loan",
      image: { src: photos.familyHouse, alt: "บ้านเดี่ยวพร้อมสนามหญ้าหน้าบ้าน" },
    },
    {
      id: "ad-02",
      sponsor: "ศิริวัฒน์ ดีเวลลอปเมนต์",
      title: "แอสเตอร์ สาทร ลงทะเบียนรับสิทธิ์ราคาพิเศษ",
      description: "คอนโด 48 ชั้น 300 ม. จาก BTS ช่องนนทรี ห้องเริ่ม 6.89 ล้าน จำนวนจำกัด",
      ctaLabel: "ลงทะเบียน",
      href: "/projects/aster-sathorn",
      image: { src: photos.towerFacade, alt: "ภาพอาคารคอนโดสูงด้านหน้า" },
    },
    {
      id: "ad-03",
      sponsor: "สเปซเมคเกอร์ อินทีเรีย",
      title: "แต่งคอนโดครบทั้งห้อง เริ่ม 199,000 บาท",
      description: "ออกแบบฟรีภายใน 7 วัน รับประกันงานบิลต์อิน 2 ปี",
      ctaLabel: "ดูผลงาน",
      href: "/advertise?campaign=interior",
      image: { src: photos.brightLiving, alt: "ห้องนั่งเล่นสีขาวตกแต่งครบ" },
    },
  ],
};
