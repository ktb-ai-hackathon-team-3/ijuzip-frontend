import type { EmploymentStatus, IncomeBand, Language } from '../api/types';

/**
 * Dropdown option catalogs. Kept separate from the i18next locale files
 * because these are *data* (stable codes with per-language labels), not UI
 * copy — the same pattern used in the ijuzip-app.html prototype's OPTIONS
 * table. Values sent to the API are always the `code`, never the label.
 */

export interface LocalizedOption {
  code: string;
  label: Record<Language, string>;
}

export const VISA_OPTIONS: LocalizedOption[] = [
  { code: 'F-6', label: { ko: 'F-6 결혼이민', vi: 'F-6 Kết hôn di trú', km: 'F-6 អន្តោប្រវេសន៍ដោយអាពាហ៍ពិពាហ៍', en: 'F-6 Marriage migrant' } },
  { code: 'F-4', label: { ko: 'F-4 재외동포', vi: 'F-4 Kiều bào Hàn Quốc', km: 'F-4 ជនជាតិកូរ៉េនៅក្រៅប្រទេស', en: 'F-4 Overseas Korean' } },
  { code: 'F-5', label: { ko: 'F-5 영주', vi: 'F-5 Thường trú nhân', km: 'F-5 អ្នករស់នៅអចិន្ត្រៃយ៍', en: 'F-5 Permanent residency' } },
  { code: 'F-2', label: { ko: 'F-2 거주', vi: 'F-2 Cư trú', km: 'F-2 ការស្នាក់នៅ', en: 'F-2 Residency' } },
  { code: 'E-9', label: { ko: 'E-9 비전문취업', vi: 'E-9 Lao động phổ thông', km: 'E-9 ការងារទូទៅ', en: 'E-9 Non-professional employment' } },
  { code: 'H-2', label: { ko: 'H-2 방문취업', vi: 'H-2 Thăm thân kết hợp làm việc', km: 'H-2 ទស្សនកិច្ចនិងការងារ', en: 'H-2 Working visit' } },
  { code: 'D-2', label: { ko: 'D-2 유학', vi: 'D-2 Du học sinh', km: 'D-2 និស្សិត', en: 'D-2 Student' } },
  { code: 'OTHER', label: { ko: '기타', vi: 'Khác', km: 'ផ្សេងទៀត', en: 'Other' } },
];

export const NATIONALITY_OPTIONS: LocalizedOption[] = [
  { code: 'KR', label: { ko: '대한민국', vi: 'Hàn Quốc', km: 'កូរ៉េខាងត្បូង', en: 'South Korea' } },
  { code: 'VN', label: { ko: '베트남', vi: 'Việt Nam', km: 'វៀតណាម', en: 'Vietnam' } },
  { code: 'KH', label: { ko: '캄보디아', vi: 'Campuchia', km: 'កម្ពុជា', en: 'Cambodia' } },
  { code: 'CN', label: { ko: '중국', vi: 'Trung Quốc', km: 'ចិន', en: 'China' } },
  { code: 'TH', label: { ko: '태국', vi: 'Thái Lan', km: 'ថៃ', en: 'Thailand' } },
  { code: 'PH', label: { ko: '필리핀', vi: 'Philippines', km: 'ហ្វីលីពីន', en: 'Philippines' } },
  { code: 'OTHER', label: { ko: '기타', vi: 'Khác', km: 'ផ្សេងទៀត', en: 'Other' } },
];

export const INCOME_BAND_OPTIONS: { code: IncomeBand; label: Record<Language, string> }[] = [
  { code: 'M_0_100', label: { ko: '기준중위소득 100% 이하', vi: 'Dưới 100% thu nhập trung vị chuẩn', km: 'ក្រោម 100% នៃចំណូលមធ្យមស្តង់ដារ', en: '100% or below the standard median income' } },
  { code: 'M_100_150', label: { ko: '기준중위소득 100~150%', vi: '100–150% thu nhập trung vị chuẩn', km: '100-150% នៃចំណូលមធ្យមស្តង់ដារ', en: '100–150% of the standard median income' } },
  { code: 'M_150_200', label: { ko: '기준중위소득 150~200%', vi: '150–200% thu nhập trung vị chuẩn', km: '150-200% នៃចំណូលមធ្យមស្តង់ដារ', en: '150–200% of the standard median income' } },
  { code: 'M_200_300', label: { ko: '기준중위소득 200~300%', vi: '200–300% thu nhập trung vị chuẩn', km: '200-300% នៃចំណូលមធ្យមស្តង់ដារ', en: '200–300% of the standard median income' } },
  { code: 'M_300_PLUS', label: { ko: '기준중위소득 300% 초과', vi: 'Trên 300% thu nhập trung vị chuẩn', km: 'លើស 300% នៃចំណូលមធ្យមស្តង់ដារ', en: 'Above 300% of the standard median income' } },
];

export const EMPLOYMENT_STATUS_OPTIONS: { code: EmploymentStatus; label: Record<Language, string> }[] = [
  { code: 'EMPLOYED', label: { ko: '근로자(직장 소속)', vi: 'Người lao động (có công ty)', km: 'និយោជិត (មានក្រុមហ៊ុន)', en: 'Employee (with a company)' } },
  { code: 'SELF_EMPLOYED', label: { ko: '자영업', vi: 'Tự kinh doanh', km: 'អាជីវកម្មខ្លួនឯង', en: 'Self-employed' } },
  { code: 'UNEMPLOYED', label: { ko: '무직', vi: 'Không có việc làm', km: 'គ្មានការងារធ្វើ', en: 'Unemployed' } },
];

export interface RegionOption {
  code: string;
  name: string;
  label: Record<Language, string>;
  districts: string[];
}

/**
 * 대한민국 17개 시·도와 시·군·구 목록. 해커톤 범위에서는 DB/API에
 * 의존하지 않고 프론트 번들에 고정한다. API에는 공식 한국어 명칭을
 * Profile.region.sido/sigungu로 보낸다.
 */
export const REGION_OPTIONS: RegionOption[] = [
  { code: 'seoul', name: '서울특별시', label: { ko: '서울특별시', vi: 'Seoul', km: 'សេអ៊ូល', en: 'Seoul' }, districts: ['종로구','중구','용산구','성동구','광진구','동대문구','중랑구','성북구','강북구','도봉구','노원구','은평구','서대문구','마포구','양천구','강서구','구로구','금천구','영등포구','동작구','관악구','서초구','강남구','송파구','강동구'] },
  { code: 'busan', name: '부산광역시', label: { ko: '부산광역시', vi: 'Busan', km: 'ប៊ូសាន', en: 'Busan' }, districts: ['중구','서구','동구','영도구','부산진구','동래구','남구','북구','해운대구','사하구','금정구','강서구','연제구','수영구','사상구','기장군'] },
  { code: 'daegu', name: '대구광역시', label: { ko: '대구광역시', vi: 'Daegu', km: 'ដេគូ', en: 'Daegu' }, districts: ['중구','동구','서구','남구','북구','수성구','달서구','달성군','군위군'] },
  { code: 'incheon', name: '인천광역시', label: { ko: '인천광역시', vi: 'Incheon', km: 'អ៊ីនឈុន', en: 'Incheon' }, districts: ['중구','동구','미추홀구','연수구','남동구','부평구','계양구','서구','강화군','옹진군'] },
  { code: 'gwangju', name: '광주광역시', label: { ko: '광주광역시', vi: 'Gwangju', km: 'ក្វាងជូ', en: 'Gwangju' }, districts: ['동구','서구','남구','북구','광산구'] },
  { code: 'daejeon', name: '대전광역시', label: { ko: '대전광역시', vi: 'Daejeon', km: 'ដេជុន', en: 'Daejeon' }, districts: ['동구','중구','서구','유성구','대덕구'] },
  { code: 'ulsan', name: '울산광역시', label: { ko: '울산광역시', vi: 'Ulsan', km: 'អ៊ុលសាន', en: 'Ulsan' }, districts: ['중구','남구','동구','북구','울주군'] },
  { code: 'sejong', name: '세종특별자치시', label: { ko: '세종특별자치시', vi: 'Sejong', km: 'សេជុង', en: 'Sejong' }, districts: ['세종특별자치시'] },
  { code: 'gyeonggi', name: '경기도', label: { ko: '경기도', vi: 'Gyeonggi-do', km: 'ខេត្តគីយ៉ុងហ្គី', en: 'Gyeonggi-do' }, districts: ['수원시','성남시','의정부시','안양시','부천시','광명시','평택시','동두천시','안산시','고양시','과천시','구리시','남양주시','오산시','시흥시','군포시','의왕시','하남시','용인시','파주시','이천시','안성시','김포시','화성시','광주시','양주시','포천시','여주시','연천군','가평군','양평군'] },
  { code: 'gangwon', name: '강원특별자치도', label: { ko: '강원특별자치도', vi: 'Gangwon-do', km: 'ខេត្តកាំងវ៉ុន', en: 'Gangwon State' }, districts: ['춘천시','원주시','강릉시','동해시','태백시','속초시','삼척시','홍천군','횡성군','영월군','평창군','정선군','철원군','화천군','양구군','인제군','고성군','양양군'] },
  { code: 'chungbuk', name: '충청북도', label: { ko: '충청북도', vi: 'Chungcheongbuk-do', km: 'ខេត្តឈុងឆុងប៊ុក', en: 'Chungcheongbuk-do' }, districts: ['청주시','충주시','제천시','보은군','옥천군','영동군','증평군','진천군','괴산군','음성군','단양군'] },
  { code: 'chungnam', name: '충청남도', label: { ko: '충청남도', vi: 'Chungcheongnam-do', km: 'ខេត្តឈុងឆុងណាំ', en: 'Chungcheongnam-do' }, districts: ['천안시','공주시','보령시','아산시','서산시','논산시','계룡시','당진시','금산군','부여군','서천군','청양군','홍성군','예산군','태안군'] },
  { code: 'jeonbuk', name: '전북특별자치도', label: { ko: '전북특별자치도', vi: 'Jeonbuk', km: 'ខេត្តជនប៊ុក', en: 'Jeonbuk State' }, districts: ['전주시','군산시','익산시','정읍시','남원시','김제시','완주군','진안군','무주군','장수군','임실군','순창군','고창군','부안군'] },
  { code: 'jeonnam', name: '전라남도', label: { ko: '전라남도', vi: 'Jeollanam-do', km: 'ខេត្តជុលឡាណាំ', en: 'Jeollanam-do' }, districts: ['목포시','여수시','순천시','나주시','광양시','담양군','곡성군','구례군','고흥군','보성군','화순군','장흥군','강진군','해남군','영암군','무안군','함평군','영광군','장성군','완도군','진도군','신안군'] },
  { code: 'gyeongbuk', name: '경상북도', label: { ko: '경상북도', vi: 'Gyeongsangbuk-do', km: 'ខេត្តគ្យុងសាងប៊ុក', en: 'Gyeongsangbuk-do' }, districts: ['포항시','경주시','김천시','안동시','구미시','영주시','영천시','상주시','문경시','경산시','의성군','청송군','영양군','영덕군','청도군','고령군','성주군','칠곡군','예천군','봉화군','울진군','울릉군'] },
  { code: 'gyeongnam', name: '경상남도', label: { ko: '경상남도', vi: 'Gyeongsangnam-do', km: 'ខេត្តគ្យុងសាងណាំ', en: 'Gyeongsangnam-do' }, districts: ['창원시','진주시','통영시','사천시','김해시','밀양시','거제시','양산시','의령군','함안군','창녕군','고성군','남해군','하동군','산청군','함양군','거창군','합천군'] },
  { code: 'jeju', name: '제주특별자치도', label: { ko: '제주특별자치도', vi: 'Jeju-do', km: 'ខេត្តជេជូ', en: 'Jeju-do' }, districts: ['제주시','서귀포시'] },
];
