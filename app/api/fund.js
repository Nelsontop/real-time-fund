import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Shanghai');

const TZ = 'Asia/Shanghai';
const nowInTz = () => dayjs().tz(TZ);
const toTz = (input) => (input ? dayjs.tz(input, TZ) : nowInTz());

export const loadScript = (url) => {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined' || !document.body) return resolve();
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    const cleanup = () => {
      if (document.body.contains(script)) document.body.removeChild(script);
    };
    script.onload = () => {
      cleanup();
      resolve();
    };
    script.onerror = () => {
      cleanup();
      reject(new Error('数据加载失败'));
    };
    document.body.appendChild(script);
  });
};

export const loadJsonp = ({ url, callbackParam = 'callback', prefix = 'jsonp_', timeoutMs = 5000 }) => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined' || !document.body) {
      reject(new Error('无浏览器环境'));
      return;
    }

    const callbackName = `${prefix}${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const hasQuery = url.includes('?');
    const finalUrl = callbackParam
      ? `${url}${hasQuery ? '&' : '?'}${encodeURIComponent(callbackParam)}=${encodeURIComponent(callbackName)}`
      : url;
    const script = document.createElement('script');
    script.src = finalUrl;
    script.async = true;

    let timer = null;
    let settled = false;
    const cleanup = () => {
      if (timer) clearTimeout(timer);
      delete window[callbackName];
      if (document.body.contains(script)) document.body.removeChild(script);
    };
    const done = (handler) => (payload) => {
      if (settled) return;
      settled = true;
      cleanup();
      handler(payload);
    };

    window[callbackName] = done(resolve);
    script.onerror = done(() => reject(new Error('数据加载失败')));
    timer = setTimeout(done(() => reject(new Error('数据加载超时'))), timeoutMs);
    document.body.appendChild(script);
  });
};

let apidataQueue = Promise.resolve();
const withApidataLock = (task) => {
  const run = apidataQueue.then(task, task);
  apidataQueue = run.catch(() => {});
  return run;
};

const loadEastmoneyApidata = async (url) => withApidataLock(async () => {
  await loadScript(url);
  const result = window.apidata ? { ...window.apidata } : null;
  delete window.apidata;
  return result;
});

let jsonpgzQueue = Promise.resolve();
const withJsonpgzLock = (task) => {
  const run = jsonpgzQueue.then(task, task);
  jsonpgzQueue = run.catch(() => {});
  return run;
};

const loadFundGzData = async (code, timeoutMs = 5000) => withJsonpgzLock(() => new Promise((resolve, reject) => {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !document.body) {
    reject(new Error('无浏览器环境'));
    return;
  }
  const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`;
  const script = document.createElement('script');
  script.src = url;
  script.async = true;
  const originalJsonpgz = window.jsonpgz;
  let timer = null;
  let settled = false;
  const cleanup = () => {
    if (timer) clearTimeout(timer);
    window.jsonpgz = originalJsonpgz;
    if (document.body.contains(script)) document.body.removeChild(script);
  };
  const done = (handler) => (payload) => {
    if (settled) return;
    settled = true;
    cleanup();
    handler(payload);
  };

  window.jsonpgz = done(resolve);
  script.onerror = done(() => reject(new Error('基金数据加载失败')));
  timer = setTimeout(done(() => reject(new Error('基金数据加载超时'))), timeoutMs);
  document.body.appendChild(script);
}));

export const fetchFundNetValue = async (code, date) => {
  if (typeof window === 'undefined') return null;
  const url = `https://fundf10.eastmoney.com/F10DataApi.aspx?type=lsjz&code=${code}&page=1&per=1&sdate=${date}&edate=${date}`;
  try {
    const apidata = await loadEastmoneyApidata(url);
    if (apidata && apidata.content) {
      const content = apidata.content;
      if (content.includes('暂无数据')) return null;
      const rows = content.split('<tr>');
      for (const row of rows) {
        if (row.includes(`<td>${date}</td>`)) {
          const cells = row.match(/<td[^>]*>(.*?)<\/td>/g);
          if (cells && cells.length >= 2) {
            const valStr = cells[1].replace(/<[^>]+>/g, '');
            const val = parseFloat(valStr);
            return isNaN(val) ? null : val;
          }
        }
      }
    }
    return null;
  } catch (e) {
    return null;
  }
};

export const fetchSmartFundNetValue = async (code, startDate) => {
  const today = nowInTz().startOf('day');
  let current = toTz(startDate).startOf('day');
  for (let i = 0; i < 30; i++) {
    if (current.isAfter(today)) break;
    const dateStr = current.format('YYYY-MM-DD');
    const val = await fetchFundNetValue(code, dateStr);
    if (val !== null) {
      return { date: dateStr, value: val };
    }
    current = current.add(1, 'day');
  }
  return null;
};

export const fetchFundDataFallback = async (c) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('无浏览器环境');
  }
  return new Promise(async (resolve, reject) => {
    const searchUrl = `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=1&key=${encodeURIComponent(c)}&_=${Date.now()}`;
    let fundName = '';
    try {
      const data = await loadJsonp({
        url: searchUrl,
        callbackParam: 'callback',
        prefix: 'SuggestData_fallback_',
        timeoutMs: 3000
      });
      if (data && data.Datas && data.Datas.length > 0) {
        const found = data.Datas.find(d => d.CODE === c);
        if (found) {
          fundName = found.NAME || found.SHORTNAME || '';
        }
      }
    } catch (e) {
    }
    const tUrl = `https://qt.gtimg.cn/q=jj${c}`;
    const tScript = document.createElement('script');
    tScript.src = tUrl;
    tScript.onload = () => {
      const v = window[`v_jj${c}`];
      if (v && v.length > 5) {
        const p = v.split('~');
        const name = fundName || p[1] || `未知基金(${c})`;
        const dwjz = p[5];
        const zzl = parseFloat(p[7]);
        const jzrq = p[8] ? p[8].slice(0, 10) : '';
        if (dwjz) {
          resolve({
            code: c,
            name: name,
            dwjz: dwjz,
            gsz: null,
            gztime: null,
            jzrq: jzrq,
            gszzl: null,
            zzl: !isNaN(zzl) ? zzl : null,
            noValuation: true,
            holdings: []
          });
        } else {
          reject(new Error('未能获取到基金数据'));
        }
      } else {
        reject(new Error('未能获取到基金数据'));
      }
      if (document.body.contains(tScript)) document.body.removeChild(tScript);
    };
    tScript.onerror = () => {
      if (document.body.contains(tScript)) document.body.removeChild(tScript);
      reject(new Error('基金数据加载失败'));
    };
    document.body.appendChild(tScript);
  });
};

export const fetchFundData = async (c) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('无浏览器环境');
  }
  return new Promise(async (resolve, reject) => {
    try {
      const json = await loadFundGzData(c);
      if (!json || typeof json !== 'object') {
        fetchFundDataFallback(c).then(resolve).catch(reject);
        return;
      }
      const gszzlNum = Number(json.gszzl);
      const gzData = {
        code: json.fundcode,
        name: json.name,
        dwjz: json.dwjz,
        gsz: json.gsz,
        gztime: json.gztime,
        jzrq: json.jzrq,
        gszzl: Number.isFinite(gszzlNum) ? gszzlNum : json.gszzl
      };
      const tencentPromise = new Promise((resolveT) => {
        const tUrl = `https://qt.gtimg.cn/q=jj${c}`;
        const tScript = document.createElement('script');
        tScript.src = tUrl;
        tScript.onload = () => {
          const v = window[`v_jj${c}`];
          if (v) {
            const p = v.split('~');
            resolveT({
              dwjz: p[5],
              zzl: parseFloat(p[7]),
              jzrq: p[8] ? p[8].slice(0, 10) : ''
            });
          } else {
            resolveT(null);
          }
          if (document.body.contains(tScript)) document.body.removeChild(tScript);
        };
        tScript.onerror = () => {
          if (document.body.contains(tScript)) document.body.removeChild(tScript);
          resolveT(null);
        };
        document.body.appendChild(tScript);
      });
      const holdingsPromise = new Promise((resolveH) => {
        const holdingsUrl = `https://fundf10.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code=${c}&topline=10&year=&month=&_=${Date.now()}`;
        loadEastmoneyApidata(holdingsUrl).then(async (holdingsData) => {
          let holdings = [];
          const html = holdingsData?.content || '';
          const headerRow = (html.match(/<thead[\s\S]*?<tr[\s\S]*?<\/tr>[\s\S]*?<\/thead>/i) || [])[0] || '';
          const headerCells = (headerRow.match(/<th[\s\S]*?>([\s\S]*?)<\/th>/gi) || []).map(th => th.replace(/<[^>]*>/g, '').trim());
          let idxCode = -1, idxName = -1, idxWeight = -1;
          headerCells.forEach((h, i) => {
            const t = h.replace(/\s+/g, '');
            if (idxCode < 0 && (t.includes('股票代码') || t.includes('证券代码'))) idxCode = i;
            if (idxName < 0 && (t.includes('股票名称') || t.includes('证券名称'))) idxName = i;
            if (idxWeight < 0 && (t.includes('占净值比例') || t.includes('占比'))) idxWeight = i;
          });
          const rows = html.match(/<tbody[\s\S]*?<\/tbody>/i) || [];
          const dataRows = rows.length ? rows[0].match(/<tr[\s\S]*?<\/tr>/gi) || [] : html.match(/<tr[\s\S]*?<\/tr>/gi) || [];
          for (const r of dataRows) {
            const tds = (r.match(/<td[\s\S]*?>([\s\S]*?)<\/td>/gi) || []).map(td => td.replace(/<[^>]*>/g, '').trim());
            if (!tds.length) continue;
            let code = '';
            let name = '';
            let weight = '';
            if (idxCode >= 0 && tds[idxCode]) {
              const m = tds[idxCode].match(/(\d{6})/);
              code = m ? m[1] : tds[idxCode];
            } else {
              const codeIdx = tds.findIndex(txt => /^\d{6}$/.test(txt));
              if (codeIdx >= 0) code = tds[codeIdx];
            }
            if (idxName >= 0 && tds[idxName]) {
              name = tds[idxName];
            } else if (code) {
              const i = tds.findIndex(txt => txt && txt !== code && !/%$/.test(txt));
              name = i >= 0 ? tds[i] : '';
            }
            if (idxWeight >= 0 && tds[idxWeight]) {
              const wm = tds[idxWeight].match(/([\d.]+)\s*%/);
              weight = wm ? `${wm[1]}%` : tds[idxWeight];
            } else {
              const wIdx = tds.findIndex(txt => /\d+(?:\.\d+)?\s*%/.test(txt));
              weight = wIdx >= 0 ? tds[wIdx].match(/([\d.]+)\s*%/)?.[1] + '%' : '';
            }
            if (code || name || weight) {
              holdings.push({ code, name, weight, change: null });
            }
          }
          holdings = holdings.slice(0, 10);
          const needQuotes = holdings.filter(h => /^\d{6}$/.test(h.code) || /^\d{5}$/.test(h.code));
          if (needQuotes.length) {
            try {
              const tencentCodes = needQuotes.map(h => {
                const cd = String(h.code || '');
                if (/^\d{6}$/.test(cd)) {
                  const pfx = cd.startsWith('6') || cd.startsWith('9') ? 'sh' : ((cd.startsWith('4') || cd.startsWith('8')) ? 'bj' : 'sz');
                  return `s_${pfx}${cd}`;
                }
                if (/^\d{5}$/.test(cd)) {
                  return `s_hk${cd}`;
                }
                return null;
              }).filter(Boolean).join(',');
              if (!tencentCodes) {
                resolveH(holdings);
                return;
              }
              const quoteUrl = `https://qt.gtimg.cn/q=${tencentCodes}`;
              await new Promise((resQuote) => {
                const scriptQuote = document.createElement('script');
                scriptQuote.src = quoteUrl;
                scriptQuote.onload = () => {
                  needQuotes.forEach(h => {
                    const cd = String(h.code || '');
                    let varName = '';
                    if (/^\d{6}$/.test(cd)) {
                      const pfx = cd.startsWith('6') || cd.startsWith('9') ? 'sh' : ((cd.startsWith('4') || cd.startsWith('8')) ? 'bj' : 'sz');
                      varName = `v_s_${pfx}${cd}`;
                    } else if (/^\d{5}$/.test(cd)) {
                      varName = `v_s_hk${cd}`;
                    } else {
                      return;
                    }
                    const dataStr = window[varName];
                    if (dataStr) {
                      const parts = dataStr.split('~');
                      if (parts.length > 5) {
                        h.change = parseFloat(parts[5]);
                      }
                    }
                  });
                  if (document.body.contains(scriptQuote)) document.body.removeChild(scriptQuote);
                  resQuote();
                };
                scriptQuote.onerror = () => {
                  if (document.body.contains(scriptQuote)) document.body.removeChild(scriptQuote);
                  resQuote();
                };
                document.body.appendChild(scriptQuote);
              });
            } catch (e) {
            }
          }
          resolveH(holdings);
        }).catch(() => resolveH([]));
      });
      Promise.all([tencentPromise, holdingsPromise]).then(([tData, holdings]) => {
        if (tData) {
          if (tData.jzrq && (!gzData.jzrq || tData.jzrq >= gzData.jzrq)) {
            gzData.dwjz = tData.dwjz;
            gzData.jzrq = tData.jzrq;
            gzData.zzl = tData.zzl;
          }
        }
        resolve({ ...gzData, holdings });
      });
    } catch (e) {
      reject(e);
    }
  });
};

export const searchFunds = async (val) => {
  if (!val.trim()) return [];
  if (typeof window === 'undefined' || typeof document === 'undefined') return [];
  const url = `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=1&key=${encodeURIComponent(val)}&_=${Date.now()}`;
  const data = await loadJsonp({
    url,
    callbackParam: 'callback',
    prefix: 'SuggestData_',
    timeoutMs: 5000
  });
  if (!data || !data.Datas) return [];
  return data.Datas.filter(d =>
    d.CATEGORY === 700 ||
    d.CATEGORY === '700' ||
    d.CATEGORYDESC === '基金'
  );
};

export const fetchShanghaiIndexDate = async () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://qt.gtimg.cn/q=sh000001&_t=${Date.now()}`;
    script.onload = () => {
      const data = window.v_sh000001;
      let dateStr = null;
      if (data) {
        const parts = data.split('~');
        if (parts.length > 30) {
          dateStr = parts[30].slice(0, 8);
        }
      }
      if (document.body.contains(script)) document.body.removeChild(script);
      resolve(dateStr);
    };
    script.onerror = () => {
      if (document.body.contains(script)) document.body.removeChild(script);
      reject(new Error('指数数据加载失败'));
    };
    document.body.appendChild(script);
  });
};

export const fetchLatestRelease = async () => {
  const res = await fetch('https://api.github.com/repos/Nelsontop/real-time-fund/releases/latest');
  if (!res.ok) return null;
  const data = await res.json();
  return {
    tagName: data.tag_name,
    body: data.body || ''
  };
};

export const submitFeedback = async (formData) => {
  const response = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    body: formData
  });
  return response.json();
};

export const fetchFundHistoryNetValue = async (code, endDate, monthsOrDays, unit = 'month') => {
  if (typeof window === 'undefined') return [];
  const today = nowInTz();
  const end = endDate ? toTz(endDate) : today;
  const start = unit === 'day' ? end.subtract(monthsOrDays, 'day') : end.subtract(monthsOrDays, 'month');
  const startDate = start.format('YYYY-MM-DD');
  const endDateStr = end.format('YYYY-MM-DD');

  // 东方财富历史净值API - 分页获取所有数据
  const allData = [];
  let page = 1;
  const perPage = 500; // 每页500条，减少单次请求压力

  try {
    while (true) {
      const url = `https://fundf10.eastmoney.com/F10DataApi.aspx?type=lsjz&code=${code}&page=${page}&per=${perPage}&sdate=${startDate}&edate=${endDateStr}`;

      const apidata = await loadEastmoneyApidata(url);

      if (!apidata || !apidata.content) {
        break;
      }

      const content = apidata.content;
      if (content.includes('暂无数据')) {
        // 第一页就没数据，返回空
        if (page === 1) return [];
        // 其他页没数据了，说明已经获取完
        break;
      }

      const rows = content.split('<tr>');
      let pageHasData = false;

      for (const row of rows) {
        const cells = row.match(/<td[^>]*>(.*?)<\/td>/g);
        if (cells && cells.length >= 4) {
          const date = cells[0].replace(/<[^>]+>/g, '').trim();
          const value = cells[1].replace(/<[^>]+>/g, '').trim();
          const navDate = dayjs(date, 'YYYY-MM-DD');
          if (navDate.isValid()) {
            const num = parseFloat(value);
            if (!isNaN(num) && num > 0) {
              allData.push({ date, value: num });
              pageHasData = true;
            }
          }
        }
      }

      // 如果这一页没有任何数据，说明已经到末尾
      if (!pageHasData) {
        break;
      }

      // 如果获取的数据少于每页数量，说明已经是最后一页
      if (rows.length <= 2) { // rows包含表头等，实际数据行会更少
        break;
      }

      page++;

      // 防止无限循环，最多获取20页（10000条数据，足够6个月使用）
      if (page > 20) {
        break;
      }

      // 添加小延迟避免请求过快
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return allData.sort((a, b) => dayjs(a.date).isBefore(dayjs(b.date)) ? -1 : 1);
  } catch (e) {
    console.error('Fetch history error:', e);
    return [];
  }
};
