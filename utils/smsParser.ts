/**
 * 신한은행 SMS 파싱 유틸리티
 * 출금/입금 메시지를 파싱하여 거래 정보를 추출합니다.
 */

export interface ParsedTransaction {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;              // YYYY-MM-DD
  accountNumber: string;     // 계좌번호 (###-###-######)
  balance: number;           // 잔액
  originalTime: string;      // HH:MM
}

/**
 * 신한은행 SMS 메시지를 파싱합니다.
 *
 * @example
 * const sms = `[Web발신]
 * 신한01/15 18:09
 * 110-355-630099
 * 출금      36,940
 * 잔액  1,775,330
 *  트레이더스 홈`;
 *
 * const parsed = parseShinhanSMS(sms);
 * // {
 * //   type: 'expense',
 * //   amount: 36940,
 * //   description: '트레이더스 홈',
 * //   date: '2025-01-15',
 * //   accountNumber: '110-355-630099',
 * //   balance: 1775330,
 * //   originalTime: '18:09'
 * // }
 */
export function parseShinhanSMS(smsText: string): ParsedTransaction | null {
  try {
    const lines = smsText
      .trim()
      .split('\n')
      .map((l) => l.trim());

    // 최소 6줄 필요
    if (lines.length < 6) {
      console.error('SMS 줄 수 부족:', lines.length);
      return null;
    }

    // Line 1: [Web발신] 체크
    if (!lines[0].includes('Web발신')) {
      console.error('웹발신 표시 없음:', lines[0]);
      return null;
    }

    // Line 2: 날짜/시간 파싱
    // 형식: 신한01/15 18:09
    const dateMatch = lines[1].match(/신한(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/);
    if (!dateMatch) {
      console.error('날짜/시간 파싱 실패:', lines[1]);
      return null;
    }

    const [_, month, day, hour, minute] = dateMatch;
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    // 연도 추론: 12월말에 1월 SMS는 다음 연도로 취급
    let year = currentYear;
    if (currentMonth === 12 && parseInt(month) === 1) {
      year = currentYear + 1;
    } else if (currentMonth === 1 && parseInt(month) === 12) {
      year = currentYear - 1;
    }

    const date = `${year}-${month}-${day}`;
    const time = `${hour}:${minute}`;

    // Line 3: 계좌번호
    // 형식: 110-355-630099
    const accountMatch = lines[2].match(/(\d{3}-\d{3}-\d{6})/);
    if (!accountMatch) {
      console.error('계좌번호 파싱 실패:', lines[2]);
      return null;
    }
    const accountNumber = accountMatch[1];

    // Line 4: 거래유형 + 금액
    // 형식: 출금      36,940 또는 입금   2,000,000
    const transactionMatch = lines[3].match(/(출금|입금)\s+([\d,]+)/);
    if (!transactionMatch) {
      console.error('거래유형/금액 파싱 실패:', lines[3]);
      return null;
    }

    const type = transactionMatch[1] === '입금' ? 'income' : 'expense';
    const amount = parseInt(transactionMatch[2].replace(/,/g, ''));

    // Line 5: 잔액
    // 형식: 잔액  1,775,330
    const balanceMatch = lines[4].match(/잔액\s+([\d,]+)/);
    if (!balanceMatch) {
      console.error('잔액 파싱 실패:', lines[4]);
      return null;
    }
    const balance = parseInt(balanceMatch[1].replace(/,/g, ''));

    // Line 6: 거래처명
    // 형식: " 트레이더스 홈" (앞에 공백)
    const description = lines[5];
    if (!description) {
      console.error('거래처명 파싱 실패: 빈 줄');
      return null;
    }

    return {
      type,
      amount,
      description,
      date,
      accountNumber,
      balance,
      originalTime: time,
    };
  } catch (error) {
    console.error('SMS 파싱 중 오류:', error);
    return null;
  }
}
