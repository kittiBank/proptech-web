/**
 * Mock photography. In production these come from the listing media service;
 * here they are Unsplash photos served through next/image.
 */
const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;

export const photos = {
  heroLiving: unsplash("1600210492486-724fe5c67fb0"),
  bangkokSkyline: unsplash("1508009603885-50cf7c579365"),
  bangkokNight: unsplash("1563492065599-3520f775eeed"),
  cityTowers: unsplash("1486406146926-c627a92ad1ab"),
  cityDusk: unsplash("1519501025264-65ba15a82390"),
  cityStreet: unsplash("1477959858617-67f85cf4f1df"),
  towerFacade: unsplash("1545324418-cc1a3fa10c00"),
  condoBuilding: unsplash("1574362848149-11496d93a7c7"),

  modernHouse: unsplash("1600596542815-ffad4c1539a9"),
  modernHouse2: unsplash("1600585154340-be6161a56a0c"),
  houseDusk: unsplash("1600047509807-ba8f99d2cdde"),
  poolVilla: unsplash("1613490493576-7fde63acd811"),
  luxuryHouse: unsplash("1512917774080-9991f1c4c750"),
  familyHouse: unsplash("1570129477492-45c003edd2be"),
  suburbanHouse: unsplash("1568605114967-8130f3a36994"),
  whiteHouse: unsplash("1580587771525-78b9dba3b914"),
  gardenHouse: unsplash("1564013799919-ab600027ffc6"),
  townhouseRow: unsplash("1605276374104-dee2a0ed3cd6"),

  livingRoom: unsplash("1600607687939-ce8a6c25118c"),
  openPlan: unsplash("1600566753190-17f0baa2a6c3"),
  studio: unsplash("1502672260266-1c1ef2d93688"),
  apartment: unsplash("1522708323590-d24dbb6b0267"),
  brightLiving: unsplash("1560448204-e02f11c3d0e2"),
  cozyLiving: unsplash("1493809842364-78817add7ffb"),
  bedroom: unsplash("1567496898669-ee935f5f647a"),
  kitchen: unsplash("1484154218962-a197022b5858"),
  kitchenWhite: unsplash("1556909114-f6e7ad7d3136"),
  loungeChair: unsplash("1618221195710-dd6b41faaea6"),

  office: unsplash("1497366216548-37526070297c"),
  shopfront: unsplash("1441986300917-64674bd600d8"),
  land: unsplash("1500382017468-9049fed747ef"),
} as const;
