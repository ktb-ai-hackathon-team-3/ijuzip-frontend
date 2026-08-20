import type {
  ApplicationChannel,
  Language,
  LocalizedText,
  Track,
} from '../api/types';

/**
 * Mock knowledge-base records — a small stand-in for the real `programs.json`
 * (§5.6 / §11 of apicontract.md), which the frontend never reads directly in
 * production; Spring resolves candidates/verdicts/detail from it. Kept here,
 * not in `api/types.ts`, because it is a mock-only internal shape.
 */
export interface MockProgram {
  programId: string;
  track: Track;
  formId: string;
  formCheckbox: string;
  benefitType: 'CASH' | 'VOUCHER' | 'SERVICE';
  name: Record<Language, string>;
  summary: Record<Language, string>;
  benefit: Record<Language, string>;
  conditionsText: Record<Language, string>[];
  applicationChannel: ApplicationChannel;
  applicationOrg: Record<Language, string>;
  requiredDocuments: Record<Language, string>[];
  deadline: Record<Language, string>;
  sourceSnippet: string;
  sourceUrl: string;
  lastVerified: string;
  conditions: {
    visaStatus: string[] | null;
    childNationality: string[] | null;
    childAgeMonthsMax: number | null;
    requiresRegistration: boolean;
    incomeMedianRatioMax: number | null;
  };
}

const t = (ko: string, vi: string, km: string, en: string): Record<Language, string> => ({
  ko,
  vi,
  km,
  en,
});

export const MOCK_PROGRAMS: MockProgram[] = [
  {
    programId: 'mohw-first-meeting-voucher',
    track: 'BIRTH_CARE',
    formId: 'birth-integrated-v1',
    formCheckbox: 'svc_first_meeting',
    benefitType: 'VOUCHER',
    name: t('첫만남이용권', 'Phiếu chào đón bé', 'សន្លឹកទទួលភ្ញៀវដំបូង', 'First Meeting Voucher'),
    summary: t(
      '2024년 1월 이후 출생아에게 지급하는 바우처예요.',
      'Phiếu hỗ trợ cho trẻ sinh từ tháng 1/2024 trở đi.',
      'ប័ណ្ណឧបត្ថម្ភសម្រាប់កូនកើតចាប់ពីខែមករា 2024 ត្រឡប់ក្រោយ។',
      'A voucher paid to children born from January 2024 onward.'
    ),
    benefit: t('200만원 바우처', 'Phiếu 2 triệu won', 'ប័ណ្ណតម្លៃ 2លានវ៉ុន', '2,000,000 KRW voucher'),
    conditionsText: [
      t('0~24개월 미만 자녀', 'Con từ 0 đến dưới 24 tháng tuổi', 'កូនអាយុពី 0 ដល់ក្រោម 24 ខែ', 'Child aged 0 to under 24 months'),
      t('한국 국적 자녀', 'Con mang quốc tịch Hàn Quốc', 'កូនមានសញ្ជាតិកូរ៉េ', 'Child holds Korean nationality'),
    ],
    applicationChannel: 'VISIT',
    applicationOrg: t(
      '출생자 주민등록 주소지 읍·면·동',
      'Văn phòng hành chính nơi đăng ký hộ khẩu của trẻ',
      'ការិយាល័យរដ្ឋបាលកន្លែងចុះបញ្ជីទីលំនៅរបស់កូន',
      'The town/township/neighborhood office of the child\'s registered address'
    ),
    requiredDocuments: [
      t('신분증', 'Giấy tờ tùy thân', 'អត្តសញ្ញាណប័ណ្ណ', 'ID card'),
      t('출생증명서', 'Giấy khai sinh', 'សំបុត្រកំណើត', 'Birth certificate'),
    ],
    deadline: t('출생일로부터 24개월', 'Trong vòng 24 tháng kể từ ngày sinh', 'ក្នុងរយៈពេល ២៤ខែគិតចាប់ពីថ្ងៃកំណើត', 'Within 24 months of birth'),
    sourceSnippet: '출생아로서 출생신고되어 정상적으로 주민등록번호를 부여받은 아동(2024년 이후 출생아로서 주민등록상 생년월일로부터 2년이 초과되지 않는 출생아)을 대상으로 합니다.',
    sourceUrl: 'https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00004656&wlfareInfoReldBztpCd=01',
    lastVerified: '2026-08-19',
    conditions: {
      visaStatus: ['F-6', 'F-5', 'F-2', 'F-4'],
      childNationality: ['KR'],
      childAgeMonthsMax: 24,
      requiresRegistration: true,
      incomeMedianRatioMax: null,
    },
  },
  {
    programId: 'mohw-parent-allowance',
    track: 'BIRTH_CARE',
    formId: 'birth-integrated-v1',
    formCheckbox: 'svc_parent_allowance',
    benefitType: 'CASH',
    name: t('부모급여', 'Trợ cấp cha mẹ', 'ប្រាក់ឧបត្ថម្ភឪពុកម្តាយ', 'Parental Allowance'),
    summary: t(
      '만 0~1세 자녀를 키우는 가정에 매달 지급하는 현금 급여예요.',
      'Trợ cấp tiền mặt hàng tháng cho gia đình nuôi con từ 0 đến 1 tuổi.',
      'ប្រាក់ឧបត្ថម្ភជារៀងរាល់ខែសម្រាប់គ្រួសារចិញ្ចឹមកូនអាយុ 0-1 ឆ្នាំ។',
      'A monthly cash allowance for families raising a child aged 0 to 1 year.'
    ),
    benefit: t('월 최대 100만원', 'Tối đa 1 triệu won/tháng', 'អតិបរមា 1លានវ៉ុន/ខែ', 'Up to 1,000,000 KRW / month'),
    conditionsText: [
      t('0~11개월 자녀', 'Con từ 0 đến 11 tháng tuổi', 'កូនអាយុពី 0 ដល់ 11 ខែ', 'Child aged 0 to 11 months'),
      t('한국 국적 자녀', 'Con mang quốc tịch Hàn Quốc', 'កូនមានសញ្ជាតិកូរ៉េ', 'Child holds Korean nationality'),
    ],
    applicationChannel: 'ONLINE',
    applicationOrg: t(
      '복지로 온라인 신청',
      'Đăng ký trực tuyến qua Bokjiro',
      'ដាក់ពាក្យអនឡាញតាមរយៈ Bokjiro',
      'Apply online via Bokjiro'
    ),
    requiredDocuments: [t('신분증', 'Giấy tờ tùy thân', 'អត្តសញ្ញាណប័ណ្ណ', 'ID card')],
    deadline: t('출생일로부터 60일 이내 신청 권장', 'Khuyến nghị đăng ký trong vòng 60 ngày kể từ ngày sinh', 'ណែនាំឱ្យដាក់ពាក្យក្នុងរយៈពេល ៦០ថ្ងៃគិតចាប់ពីថ្ងៃកំណើត', 'Applying within 60 days of birth is recommended'),
    sourceSnippet: '2세 미만의 아동(0~23개월)에게 지원합니다. 대한민국 국적을 보유한 아동을 대상으로 하며 별도의 소득인정액 기준은 없습니다.',
    sourceUrl: 'https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00004657',
    lastVerified: '2026-08-19',
    conditions: {
      visaStatus: ['F-6', 'F-5', 'F-2', 'F-4'],
      childNationality: ['KR'],
      childAgeMonthsMax: 11,
      requiresRegistration: true,
      incomeMedianRatioMax: null,
    },
  },
  {
    programId: 'mohw-child-allowance',
    track: 'BIRTH_CARE',
    formId: 'birth-integrated-v1',
    formCheckbox: 'svc_child_allowance',
    benefitType: 'CASH',
    name: t('아동수당', 'Trợ cấp trẻ em', 'ប្រាក់ឧបត្ថម្ភកុមារ', 'Child Allowance'),
    summary: t(
      '만 8세 미만 자녀에게 매달 지급하는 수당이에요.',
      'Trợ cấp hàng tháng cho trẻ dưới 8 tuổi.',
      'ប្រាក់ឧបត្ថម្ភជារៀងរាល់ខែសម្រាប់កូនអាយុក្រោម 8 ឆ្នាំ។',
      'A monthly allowance for children under 8 years old.'
    ),
    benefit: t('월 10만원', '100.000 won/tháng', '100,000វ៉ុន/ខែ', '100,000 KRW / month'),
    conditionsText: [t('만 8세 미만 자녀', 'Con dưới 8 tuổi', 'កូនអាយុក្រោម 8 ឆ្នាំ', 'Child under 8 years old')],
    applicationChannel: 'ONLINE',
    applicationOrg: t('복지로 온라인 신청', 'Đăng ký trực tuyến qua Bokjiro', 'ដាក់ពាក្យអនឡាញតាមរយៈ Bokjiro', 'Apply online via Bokjiro'),
    requiredDocuments: [t('신분증', 'Giấy tờ tùy thân', 'អត្តសញ្ញាណប័ណ្ណ', 'ID card')],
    deadline: t('상시 신청 가능', 'Có thể đăng ký bất cứ lúc nào', 'អាចដាក់ពាក្យបានគ្រប់ពេល', 'Can apply anytime'),
    sourceSnippet: '만 8세 미만의 아동에게 아동수당을 지급합니다. 주민등록번호가 정상적으로 부여된 아동에게 지원합니다.',
    sourceUrl: 'https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00001171',
    lastVerified: '2026-08-19',
    conditions: {
      visaStatus: ['F-6', 'F-5', 'F-2', 'F-4', 'E-9', 'H-2', 'D-2'],
      childNationality: null,
      childAgeMonthsMax: 96,
      requiresRegistration: true,
      incomeMedianRatioMax: null,
    },
  },
  {
    programId: 'gg-birth-grant',
    track: 'BIRTH_CARE',
    formId: 'birth-integrated-v1',
    formCheckbox: 'svc_gg_grant',
    benefitType: 'CASH',
    name: t('안산시 출생축하금', 'Trợ cấp chúc mừng sinh con Ansan', 'ប្រាក់អបអរសាទរកំណើតក្រុងអានសាន', 'Ansan Childbirth Celebration Grant'),
    summary: t(
      '안산시에 일정 기간 거주하고 자녀를 안산시에 출생신고한 가정에 지급하는 축하금이에요.',
      'Khoản trợ cấp cho gia đình đã cư trú tại Ansan trong thời gian quy định và đăng ký khai sinh cho con tại Ansan.',
      'ប្រាក់ឧបត្ថម្ភសម្រាប់គ្រួសារដែលបានរស់នៅអានសានតាមរយៈពេលកំណត់ និងបានចុះបញ្ជីកំណើតកូននៅអានសាន។',
      'A grant for families who meet the Ansan residency period and register their child\'s birth in Ansan.'
    ),
    benefit: t('첫째아 100만원, 둘째아 이상 300만원, 셋째아 이상 500만원', 'Con đầu 1 triệu won, con thứ hai trở lên 3 triệu won, con thứ ba trở lên 5 triệu won', 'កូនទីមួយ 1លានវ៉ុន កូនទីពីរឡើង 3លានវ៉ុន កូនទីបីឡើង 5លានវ៉ុន', 'KRW 1M for the first child, 3M for the second or later, and 5M for the third or later'),
    conditionsText: [
      t('부·모 또는 보호자가 안산시에 연속 1년 이상 주민등록', 'Cha, mẹ hoặc người giám hộ đã đăng ký cư trú tại Ansan liên tục ít nhất 1 năm', 'ឪពុក ម្តាយ ឬអាណាព្យាបាលបានចុះបញ្ជីរស់នៅអានសានជាប់គ្នាយ៉ាងតិច 1 ឆ្នាំ', 'A parent or guardian has been registered in Ansan continuously for at least one year'),
      t('자녀를 안산시에 출생신고', 'Đăng ký khai sinh cho con tại Ansan', 'ចុះបញ្ជីកំណើតកូននៅអានសាន', 'The child\'s birth is registered in Ansan'),
    ],
    applicationChannel: 'VISIT',
    applicationOrg: t('관할 동 행정복지센터', 'Trung tâm hành chính phường phụ trách', 'មជ្ឈមណ្ឌលរដ្ឋបាលសង្កាត់ដែលទទួលបន្ទុក', 'The responsible neighborhood administrative welfare center'),
    requiredDocuments: [t('신분증', 'Giấy tờ tùy thân', 'អត្តសញ្ញាណប័ណ្ណ', 'ID card')],
    deadline: t('출생일로부터 1년 6개월 이내', 'Trong vòng 1 năm 6 tháng kể từ ngày sinh', 'ក្នុងរយៈពេល ១ឆ្នាំ៦ខែគិតចាប់ពីថ្ងៃកំណើត', 'Within 1 year and 6 months of birth'),
    sourceSnippet: '부 또는 모, 보호자가 출생일 현재 연속하여 1년 이상 안산시에 주민등록이 되어 있고, 출생아가 안산시에 출생신고가 되어 있는 가정을 대상으로 합니다.',
    sourceUrl: 'https://ansan.go.kr/iloveyou/sub/contents.do?c1=3&c3=14',
    lastVerified: '2026-08-19',
    conditions: {
      visaStatus: ['F-6', 'F-5', 'F-2', 'F-4'],
      childNationality: ['KR'],
      childAgeMonthsMax: 12,
      requiresRegistration: true,
      incomeMedianRatioMax: null,
    },
  },
  {
    // 실제 KB(programs.json)에서 소득 조건이 걸린 유일한 제도다.
    // 목에 없으면 소득 재질문 경로를 전혀 재현할 수 없다.
    programId: 'mohw-childbirth-benefit',
    track: 'BIRTH_CARE',
    formId: 'birth-integrated-v1',
    formCheckbox: 'svc_childbirth_benefit',
    benefitType: 'CASH',
    name: t('해산급여', 'Trợ cấp sinh nở', 'ប្រាក់ឧបត្ថម្ភសម្រាល', 'Childbirth Benefit'),
    summary: t(
      '기초생활보장 수급 가구의 출산에 지급하는 급여예요.',
      'Khoản trợ cấp chi trả khi sinh con cho hộ gia đình đang nhận bảo đảm sinh kế cơ bản.',
      'ប្រាក់ឧបត្ថម្ភសម្រាប់ការសម្រាលកូនរបស់គ្រួសារដែលទទួលបានការធានាជីវភាពមូលដ្ឋាន។',
      'A benefit paid on childbirth to households receiving basic livelihood security.'
    ),
    benefit: t('출생아 1명당 70만원', '700.000 won cho mỗi trẻ', '700,000 វ៉ុនក្នុងមួយកូន', 'KRW 700,000 per child'),
    conditionsText: [
      t('기준중위소득 100% 이하', 'Dưới 100% thu nhập trung vị chuẩn', 'ក្រោម 100% នៃចំណូលមធ្យមស្តង់ដារ', '100% or below the standard median income'),
    ],
    applicationChannel: 'VISIT',
    applicationOrg: t('관할 동 행정복지센터', 'Trung tâm hành chính phường phụ trách', 'មជ្ឈមណ្ឌលរដ្ឋបាលសង្កាត់ដែលទទួលបន្ទុក', 'The responsible neighborhood administrative welfare center'),
    requiredDocuments: [t('신분증', 'Giấy tờ tùy thân', 'អត្តសញ្ញាណប័ណ្ណ', 'ID card')],
    deadline: t('출생일로부터 1년 이내', 'Trong vòng 1 năm kể từ ngày sinh', 'ក្នុងរយៈពេល ១ឆ្នាំគិតចាប់ពីថ្ងៃកំណើត', 'Within 1 year of birth'),
    sourceSnippet: '해산급여는 기초생활보장 수급자 중 출산(예정)한 경우 출생아 1명당 지급합니다.',
    sourceUrl: 'https://www.bokjiro.go.kr/',
    lastVerified: '2026-08-19',
    conditions: {
      visaStatus: null,
      childNationality: ['KR'],
      childAgeMonthsMax: 12,
      requiresRegistration: true,
      incomeMedianRatioMax: 100,
    },
  },
  {
    programId: 'moel-injury-treatment',
    track: 'LABOR_INJURY',
    formId: 'labor-injury-v1',
    formCheckbox: 'svc_treatment',
    benefitType: 'SERVICE',
    name: t('산재요양급여', 'Trợ cấp điều trị tai nạn lao động', 'ប្រាក់ឧបត្ថម្ភព្យាបាលរបួសពីការងារ', 'Industrial Accident Medical Care Benefit'),
    summary: t(
      '업무 중 다쳐 치료가 필요할 때 치료비를 지원해요. 체류자격과 무관하게 적용돼요.',
      'Hỗ trợ chi phí điều trị khi bị thương trong lúc làm việc, áp dụng bất kể loại visa.',
      'ជួយចំណាយលើការព្យាបាលពេលរងរបួសពេលធ្វើការ អនុវត្តដោយមិនគិតពីប្រភេទទិដ្ឋាការ។',
      'Covers treatment costs when injured at work, regardless of visa status.'
    ),
    benefit: t('치료비 전액', 'Toàn bộ chi phí điều trị', 'ចំណាយព្យាបាលពេញលេញ', 'Full treatment cost'),
    conditionsText: [t('업무상 재해로 인한 부상 또는 질병', 'Thương tích hoặc bệnh do tai nạn lao động', 'របួស ឬជំងឺបណ្ដាលមកពីគ្រោះថ្នាក់ការងារ', 'Injury or illness caused by a workplace accident')],
    applicationChannel: 'VISIT',
    applicationOrg: t('근로복지공단 지사', 'Chi nhánh Công đoàn Phúc lợi Lao động', 'សាខាអង្គការសុខុមាលភាពការងារ', 'Korea Workers\' Compensation & Welfare Service branch office'),
    requiredDocuments: [t('신분증', 'Giấy tờ tùy thân', 'អត្តសញ្ញាណប័ណ្ណ', 'ID card'), t('진단서', 'Giấy chẩn đoán y tế', 'លិខិតធ្វើរោគវិនិច្ឆ័យ', 'Medical diagnosis certificate')],
    deadline: t('재해일로부터 3년 이내', 'Trong vòng 3 năm kể từ ngày xảy ra tai nạn', 'ក្នុងរយៈពេល ៣ឆ្នាំគិតចាប់ពីថ្ងៃកើតគ្រោះថ្នាក់', 'Within 3 years of the accident'),
    sourceSnippet: '지원대상: 업무상 사유로 부상·질병·장해가 발생한 근로자. 체류자격 무관.',
    sourceUrl: 'https://webzine.comwel.or.kr/vol115/sub02.html',
    lastVerified: '2026-08-19',
    conditions: {
      visaStatus: null,
      childNationality: null,
      childAgeMonthsMax: null,
      requiresRegistration: false,
      incomeMedianRatioMax: null,
    },
  },
  {
    programId: 'moel-injury-wage-comp',
    track: 'LABOR_INJURY',
    formId: 'labor-injury-v1',
    formCheckbox: 'svc_wage_comp',
    benefitType: 'CASH',
    name: t('산재휴업급여', 'Trợ cấp nghỉ việc do tai nạn lao động', 'ប្រាក់ឧបត្ថម្ភឈប់សម្រាកពីគ្រោះថ្នាក់ការងារ', 'Industrial Accident Wage Replacement Benefit'),
    summary: t(
      '업무 중 다쳐 치료 기간 동안 일하지 못할 때 평균임금의 70%를 지급해요.',
      'Trả 70% lương bình quân trong thời gian không thể làm việc do điều trị tai nạn lao động.',
      'បង់ 70% នៃប្រាក់ខែជាមធ្យមក្នុងអំឡុងពេលព្យាបាលដែលមិនអាចធ្វើការបាន។',
      'Pays 70% of average wages during the period you cannot work while treating a workplace injury.'
    ),
    benefit: t('평균임금의 70%', '70% lương bình quân', '70% នៃប្រាក់ខែជាមធ្យម', '70% of average wages'),
    conditionsText: [t('요양으로 취업하지 못한 기간이 있을 것', 'Có thời gian không thể làm việc vì điều trị', 'មានរយៈពេលមិនអាចធ្វើការបានដោយសារព្យាបាល', 'There is a period of being unable to work due to medical care')],
    applicationChannel: 'VISIT',
    applicationOrg: t('근로복지공단 지사', 'Chi nhánh Công đoàn Phúc lợi Lao động', 'សាខាអង្គការសុខុមាលភាពការងារ', 'Korea Workers\' Compensation & Welfare Service branch office'),
    requiredDocuments: [t('신분증', 'Giấy tờ tùy thân', 'អត្តសញ្ញាណប័ណ្ណ', 'ID card'), t('요양확인서', 'Giấy xác nhận điều trị', 'លិខិតបញ្ជាក់ការព្យាបាល', 'Certificate of medical treatment')],
    deadline: t('재해일로부터 3년 이내', 'Trong vòng 3 năm kể từ ngày xảy ra tai nạn', 'ក្នុងរយៈពេល ៣ឆ្នាំគិតចាប់ពីថ្ងៃកើតគ្រោះថ្នាក់', 'Within 3 years of the accident'),
    sourceSnippet: '지원대상: 요양으로 취업하지 못한 근로자. 체류자격 무관.',
    sourceUrl: 'https://webzine.comwel.or.kr/vol115/sub02.html',
    lastVerified: '2026-08-19',
    conditions: {
      visaStatus: null,
      childNationality: null,
      childAgeMonthsMax: null,
      requiresRegistration: false,
      incomeMedianRatioMax: null,
    },
  },
];

export function findMockProgram(programId: string): MockProgram | undefined {
  return MOCK_PROGRAMS.find((program) => program.programId === programId);
}

export function localize(text: Record<Language, string>, lang: Language): LocalizedText {
  return { ko: text.ko, user: text[lang] ?? text.ko };
}
