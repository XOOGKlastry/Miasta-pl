/* Dekoracje planszy: każda kraina (województwo) ma własne motywy rysowane w stylu gry.
   Krainy.deko(woj, W, H, punkty) zwraca <svg> z motywami rozstawionymi wokół ścieżki,
   tak żeby nie zasłaniały pól poziomów. Motyw rysowany jest w polu ok. 64×64 jednostek, środek u dołu (32,64). */
window.Krainy=(function(){
  const K='stroke="#3A2A14" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"';
  const M={
    // przyroda
    sosna:`<path d="M32 4L18 26h8L14 44h10L10 58h44L40 44h10L38 26h8z" fill="#3E7D3A" ${K}/><rect x="28" y="58" width="8" height="6" fill="#7A4E26" ${K}/>`,
    drzewo:`<circle cx="32" cy="26" r="20" fill="#5FA346" ${K}/><circle cx="24" cy="22" r="6" fill="#7DBB5E"/><rect x="28" y="44" width="8" height="20" fill="#7A4E26" ${K}/>`,
    jablon:`<circle cx="32" cy="26" r="20" fill="#5FA346" ${K}/><circle cx="24" cy="20" r="3.2" fill="#E84A3C" ${K}/><circle cx="38" cy="18" r="3.2" fill="#E84A3C" ${K}/><circle cx="30" cy="32" r="3.2" fill="#E84A3C" ${K}/><circle cx="42" cy="30" r="3.2" fill="#E84A3C" ${K}/><rect x="28" y="44" width="8" height="20" fill="#7A4E26" ${K}/>`,
    dab:`<path d="M10 30c0-14 10-22 22-22s22 8 22 22c0 10-8 14-14 14H24c-6 0-14-4-14-14z" fill="#4E8A35" ${K}/><circle cx="20" cy="22" r="5" fill="#6EAB4E"/><circle cx="40" cy="18" r="5" fill="#6EAB4E"/><path d="M24 44c4 4 4 12 2 20h12c-2-8-2-16 2-20" fill="#6B4220" ${K}/><path d="M30 50v8" ${K}/>`,
    krzak:`<path d="M8 64c0-12 8-18 14-16 2-8 18-8 20 0 6-2 14 4 14 16z" fill="#6EAB4E" ${K}/>`,
    wydma:`<path d="M2 64c10-22 24-26 34-14 8-8 18-6 26 14z" fill="#F2D99A" ${K}/><path d="M16 50l3-8M22 46l2-9M44 52l3-7" stroke="#6E9A45" stroke-width="2.2" stroke-linecap="round"/>`,
    jezioro:`<ellipse cx="32" cy="50" rx="30" ry="12" fill="#6FB6DE" ${K}/><path d="M14 50q5-3 10 0M36 54q5-3 10 0" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
    pole:`<path d="M4 64l10-26h36l10 26z" fill="#E9C85B" ${K}/><path d="M14 64l6-26M26 64l3-26M38 64l-1-26M50 64l-5-26" stroke="#B9962F" stroke-width="2"/>`,
    pole2:`<path d="M4 64l10-26h36l10 26z" fill="#9BC85A" ${K}/><path d="M9 52h46M12 44h40" stroke="#6E9A45" stroke-width="2"/>`,
    gory:`<path d="M0 64L22 18l12 18 8-12 22 40z" fill="#8E97A6" ${K}/><path d="M16 30l6-12 7 11-5-2-4 5z" fill="#fff" ${K}/><path d="M38 30l4-6 6 9-4-1z" fill="#fff" ${K}/>`,
    giewont:`<path d="M0 64L18 26l10 8 10-24 26 54z" fill="#8E97A6" ${K}/><path d="M33 16l5-6 6 12-6-2-3 4z" fill="#fff" ${K}/><path d="M38 2v10M34.5 5.5h7" stroke="#3A2A14" stroke-width="2.4" stroke-linecap="round"/>`,
    polonina:`<path d="M0 64c6-26 18-34 30-30 8-12 26-10 34 6v24z" fill="#9CC46A" ${K}/><path d="M14 52c6-6 14-8 20-6" fill="none" stroke="#6E9A45" stroke-width="2"/>`,
    jaskinia:`<path d="M4 64c0-30 14-46 28-46s28 16 28 46z" fill="#A49B8B" ${K}/><path d="M20 64c0-14 6-22 12-22s12 8 12 22z" fill="#3A2A14"/>`,
    maczuga:`<path d="M24 64c2-10 0-20-4-30-3-10 2-24 12-24s16 12 12 24c-4 10-6 20-4 30z" fill="#D8D2C2" ${K}/><path d="M14 64c4-6 10-6 14 0M40 64c4-6 10-6 12 0" fill="#7DBB5E" ${K}/>`,
    // zwierzęta
    zubr:`<path d="M10 44c0-12 8-18 18-18 4-8 16-8 22 0 6 2 8 10 6 18H48v18h-6V50H24v12h-6V48z" fill="#6B4A2E" ${K}/><path d="M50 26c2-4 6-4 8 0" fill="none" ${K}/><circle cx="52" cy="34" r="1.6" fill="#fff"/>`,
    los:`<path d="M14 40h30c4 0 6-6 10-6l4 4-4 6v20h-5V50H22v14h-5V48c-4-2-4-8-3-8z" fill="#7A5232" ${K}/><path d="M50 32c-4-6-2-12 2-12M54 30c2-6 8-8 8-4" fill="none" ${K}/>`,
    koziolki:`<g fill="#F4F1EA" ${K}><path d="M6 46c0-8 6-12 12-12h6l4-6 3 6c2 2 2 6 0 8v20h-4V52H14v10h-4V50z"/><path d="M58 46c0-8-6-12-12-12h-6l-4-6-3 6c-2 2-2 6 0 8v20h4V52h10v10h4V50z"/></g><path d="M26 28c-2-6 2-10 6-8M38 28c2-6-2-10-6-8" fill="none" ${K}/>`,
    zyrafa:`<path d="M18 64V40c0-6 4-8 10-8h4V10c0-4 2-6 6-6h6l4 4-6 2v26c4 0 6 4 6 8v20h-5V48h-5v16h-5V50h-6v14z" fill="#F5B82E" ${K}/><circle cx="26" cy="44" r="2.4" fill="#A0601E"/><circle cx="36" cy="22" r="2" fill="#A0601E"/><circle cx="38" cy="40" r="2.4" fill="#A0601E"/>`,
    dino:`<path d="M6 54c4-10 14-14 24-12l8-18c2-6 10-6 12 0l-4 4 2 4-6 2-4 14c6 2 8 8 8 14h-6l-2-6h-8l-2 6h-6v-6c-6 0-12 2-16 0z" fill="#7DBB5E" ${K}/><circle cx="46" cy="22" r="1.6" fill="#3A2A14"/><path d="M22 42l2-5 3 4 2-5 3 5" fill="none" ${K}/>`,
    // woda i niebo
    statek:`<path d="M6 46h52l-8 14H14z" fill="#E84A3C" ${K}/><rect x="18" y="34" width="24" height="12" fill="#F4F1EA" ${K}/><rect x="34" y="24" width="7" height="10" fill="#3A2A14"/><path d="M22 40h4M30 40h4" ${K}/><path d="M2 62q6-4 12 0t12 0 12 0 12 0 12 0" fill="none" stroke="#2E7DB5" stroke-width="2.4"/>`,
    zaglowka:`<path d="M12 52h40l-6 8H18z" fill="#A0601E" ${K}/><path d="M32 8v44" ${K}/><path d="M32 10l18 36H32z" fill="#F4F1EA" ${K}/><path d="M30 18L14 46h16z" fill="#E84A3C" ${K}/><path d="M4 62q7-4 14 0t14 0 14 0 14 0" fill="none" stroke="#2E7DB5" stroke-width="2.4"/>`,
    latarnia:`<path d="M24 64l4-44h8l4 44z" fill="#F4F1EA" ${K}/><path d="M25 50h14M26 36h12" stroke="#E84A3C" stroke-width="6"/><rect x="26" y="12" width="12" height="8" fill="#F5B82E" ${K}/><path d="M24 12l8-8 8 8z" fill="#E84A3C" ${K}/><path d="M42 16l12-4M42 18l12 4" stroke="#F5B82E" stroke-width="2.4" stroke-linecap="round"/>`,
    molo:`<path d="M0 50h64" ${K}/><path d="M4 50h56v4H4z" fill="#C49A62" ${K}/><path d="M10 54v10M24 54v10M40 54v10M54 54v10" ${K}/><path d="M50 50V36h10v14" fill="#F4F1EA" ${K}/><path d="M48 36l7-6 7 6z" fill="#2E7DB5" ${K}/>`,
    szybowiec:`<path d="M2 30l60-6-2 4-60 6z" fill="#F4F1EA" ${K}/><path d="M24 30c4-4 14-4 20 0l-4 4H28z" fill="#E84A3C" ${K}/><path d="M40 32l14 0" ${K}/>`,
    awionetka:`<path d="M10 34h36c6 0 10 2 10 4s-4 4-10 4H14z" fill="#F5B82E" ${K}/><path d="M24 34l6-12h6l-2 12M26 42l4 10h6l-2-10" fill="#E84A3C" ${K}/><path d="M58 32v12" stroke="#3A2A14" stroke-width="3"/><path d="M10 34l-6-8h6l6 8" fill="#E84A3C" ${K}/>`,
    // budowle
    chata:`<rect x="12" y="34" width="40" height="30" fill="#E8C793" ${K}/><path d="M6 36l26-22 26 22z" fill="#A0601E" ${K}/><rect x="28" y="46" width="9" height="18" fill="#7A4E26" ${K}/><rect x="16" y="42" width="8" height="8" fill="#9FD4F2" ${K}/>`,
    domek_pod:`<rect x="12" y="34" width="40" height="30" fill="#4FA3D9" ${K}/><path d="M6 36l26-22 26 22z" fill="#2F7A4A" ${K}/><rect x="16" y="42" width="9" height="10" fill="#fff" ${K}/><rect x="39" y="42" width="9" height="10" fill="#fff" ${K}/><path d="M14 40h2M48 40h2M28 26h8" stroke="#F5B82E" stroke-width="2.6"/><rect x="28" y="52" width="8" height="12" fill="#F5B82E" ${K}/>`,
    kamienice:`<path d="M2 64V30l8-8 8 8v34z" fill="#E8B26A" ${K}/><path d="M18 64V22l10-10 10 10v42z" fill="#E87A5A" ${K}/><path d="M38 64V30l12-10 12 10v34z" fill="#9FC7A8" ${K}/><path d="M8 38h4M8 48h4M24 30h8M24 42h8M46 38h8M46 48h8" stroke="#3A2A14" stroke-width="3"/>`,
    zamek:`<path d="M6 64V30h8v-6h6v6h8V20h8v10h8v-6h6v6h8v34z" fill="#C9B79A" ${K}/><path d="M28 20V10l4-6 4 6v10" fill="#E84A3C" ${K}/><path d="M26 64V50a6 6 0 0 1 12 0v14" fill="#7A4E26" ${K}/><path d="M14 40h4M46 40h4" stroke="#3A2A14" stroke-width="3"/>`,
    palac:`<rect x="4" y="34" width="56" height="30" fill="#F4E6C8" ${K}/><path d="M2 36l30-12 30 12z" fill="#B5643C" ${K}/><path d="M24 34V24h16v10" fill="#F4E6C8" ${K}/><path d="M26 24l6-8 6 8z" fill="#2F7A4A" ${K}/><path d="M10 44h6M22 44h6M36 44h6M48 44h6M10 54h6M48 54h6" stroke="#3A2A14" stroke-width="3"/><rect x="28" y="50" width="8" height="14" fill="#7A4E26" ${K}/>`,
    kosciolek:`<rect x="14" y="36" width="30" height="28" fill="#A0703C" ${K}/><path d="M10 38l19-14 19 14z" fill="#6B4220" ${K}/><rect x="40" y="22" width="12" height="42" fill="#A0703C" ${K}/><path d="M38 24l8-14 8 14z" fill="#6B4220" ${K}/><path d="M46 6v6M43.5 8h5" ${K}/><rect x="25" y="48" width="8" height="16" fill="#3A2A14"/>`,
    cerkiew:`<rect x="14" y="34" width="36" height="30" fill="#F4F1EA" ${K}/><path d="M20 34c0-8 5-12 12-12s12 4 12 12z" fill="#4FA3D9" ${K}/><path d="M32 22c-4-4-4-8 0-12 4 4 4 8 0 12z" fill="#F5B82E" ${K}/><path d="M32 2v8M29 5h6" ${K}/><path d="M28 64V50a4 4 0 0 1 8 0v14" fill="#7A4E26" ${K}/>`,
    wiatrak:`<path d="M24 64l3-30h10l3 30z" fill="#C49A62" ${K}/><path d="M22 34l10-8 10 8z" fill="#7A4E26" ${K}/><g transform="translate(32 26)"><g class="kr-smigla"><path d="M0 0L-4-22h8z M0 0L22-4v8z M0 0L4 22h-8z M0 0L-22 4v-8z" fill="#F4F1EA" ${K}/></g></g><circle cx="32" cy="26" r="2.6" fill="#3A2A14"/>`,
    ul:`<path d="M14 64V40c0-10 8-16 18-16s18 6 18 16v24z" fill="#F5B82E" ${K}/><path d="M14 44h36M14 54h36" stroke="#A0601E" stroke-width="2.4"/><circle cx="32" cy="58" r="3" fill="#3A2A14"/><circle cx="50" cy="18" r="3" fill="#F5B82E" ${K}/><path d="M48 15l-3-3M52 15l3-3" stroke="#9FD4F2" stroke-width="2.4" stroke-linecap="round"/>`,
    chmiel:`<path d="M22 64V4M42 64V4" ${K}/><path d="M22 14c8 0 12 6 20 6M22 34c8 0 12 6 20 6" fill="none" stroke="#3E7D3A" stroke-width="2.4"/><g fill="#9BC85A" ${K}><path d="M28 18c-4 0-6 4-4 8 4 0 6-4 4-8z"/><path d="M36 38c-4 0-6 4-4 8 4 0 6-4 4-8z"/><path d="M30 50c-4 0-6 4-4 8 4 0 6-4 4-8z"/><path d="M36 24c-4 0-6 4-4 8 4 0 6-4 4-8z"/></g>`,
    pkin:`<path d="M20 64V40h24v24z" fill="#E8D8B8" ${K}/><path d="M24 40V24h16v16z" fill="#E8D8B8" ${K}/><path d="M27 24V12h10v12z" fill="#E8D8B8" ${K}/><path d="M30 12l2-10 2 10z" fill="#E8D8B8" ${K}/><path d="M12 64V48h8M52 64V48h-8" fill="#E8D8B8" ${K}/><rect x="29" y="15" width="6" height="5" fill="#F4F1EA" ${K}/><path d="M28 32h8M24 48h16M24 56h16" stroke="#3A2A14" stroke-width="2"/>`,
    syrenka:`<path d="M30 30c-6 6-8 14-4 22 2 4 8 6 12 4l8 8 2-10-6-4c4-6 2-14-4-20z" fill="#5FB0A3" ${K}/><circle cx="31" cy="20" r="6" fill="#F4D0A8" ${K}/><path d="M26 16c2-6 10-6 12 0" fill="#F5B82E" ${K}/><path d="M22 34l-6 12 10-6z" fill="#C9B79A" ${K}/><path d="M38 30l8-20" ${K}/><path d="M44 8l4 2-2 4" fill="none" ${K}/>`,
    zamek_krol:`<rect x="4" y="34" width="56" height="30" fill="#E8A06A" ${K}/><rect x="26" y="12" width="12" height="52" fill="#E8A06A" ${K}/><path d="M24 14l8-10 8 10z" fill="#2F7A4A" ${K}/><circle cx="32" cy="24" r="4" fill="#F4F1EA" ${K}/><path d="M10 44h6M48 44h6M10 54h6M48 54h6" stroke="#3A2A14" stroke-width="3"/>`,
    rynek:`<path d="M2 64V34l6-8 6 8v30z" fill="#F5B82E" ${K}/><path d="M14 64V30l6-8 6 8v34z" fill="#E87A5A" ${K}/><path d="M26 64V14l6-10 6 10v50z" fill="#C9B79A" ${K}/><path d="M38 64V30l6-8 6 8v34z" fill="#9FC7A8" ${K}/><path d="M50 64V34l6-8 6 8v30z" fill="#4FA3D9" ${K}/><path d="M30 24h4M30 36h4" stroke="#3A2A14" stroke-width="3"/>`,
    skytower:`<path d="M20 64V10l6-6h12l6 6v54z" fill="#9FC7DD" ${K}/><path d="M26 10v54M32 6v58M38 10v54" stroke="#3A2A14" stroke-width="1.4" opacity=".55"/><path d="M8 64V44h12M56 64V40H44" fill="#C9D6DE" ${K}/>`,
    manufaktura:`<rect x="4" y="30" width="44" height="34" fill="#B5543C" ${K}/><path d="M48 64V10h10v54z" fill="#B5543C" ${K}/><path d="M48 14h10" stroke="#3A2A14" stroke-width="2.4"/><path d="M10 38h6M22 38h6M34 38h6M10 50h6M22 50h6M34 50h6" stroke="#F5D9A8" stroke-width="4"/><path d="M50 6c2-4 6-4 8 0" fill="none" stroke="#9AA" stroke-width="2.4"/>`,
    szyb:`<path d="M14 64L24 12h16l10 52" fill="none" ${K}/><path d="M18 44h28M21 30h22" ${K}/><circle cx="24" cy="12" r="6" fill="#C9B79A" ${K}/><circle cx="40" cy="12" r="6" fill="#C9B79A" ${K}/><rect x="4" y="50" width="16" height="14" fill="#B5543C" ${K}/><rect x="44" y="50" width="16" height="14" fill="#B5543C" ${K}/>`,
    spodek:`<path d="M2 44c10-10 50-10 60 0-10 8-50 8-60 0z" fill="#9AA7B0" ${K}/><path d="M8 44c10 6 38 6 48 0" fill="none" stroke="#F4F1EA" stroke-width="2"/><path d="M14 50l-6 14M50 50l6 14M24 52l-2 12M40 52l2 12" ${K}/>`,
    wawel:`<rect x="4" y="38" width="56" height="26" fill="#F4E6C8" ${K}/><path d="M2 40l30-8 30 8z" fill="#B5643C" ${K}/><rect x="12" y="20" width="10" height="20" fill="#F4E6C8" ${K}/><path d="M10 20c0-6 4-10 7-10s7 4 7 10z" fill="#F5B82E" ${K}/><rect x="40" y="16" width="12" height="24" fill="#F4E6C8" ${K}/><path d="M38 16l8-10 8 10z" fill="#2F7A4A" ${K}/><path d="M10 50h6M26 50h6M44 50h6" stroke="#3A2A14" stroke-width="3"/>`,
    zuzel:`<circle cx="16" cy="54" r="9" fill="none" ${K}/><circle cx="48" cy="54" r="9" fill="none" ${K}/><path d="M16 54l12-14h12l8 14M28 40l-4-6h8" fill="none" ${K}/><circle cx="34" cy="22" r="5" fill="#E84A3C" ${K}/><path d="M34 28l-4 12M34 30l8 4" ${K}/><path d="M2 60q8-6 12 2" fill="none" stroke="#C49A62" stroke-width="3"/>`,
    rogal:`<path d="M8 50c0-14 10-24 24-24s24 10 24 24c-4-4-8-4-10 0-2-6-8-8-14-6-6-2-12 0-14 6-2-4-6-4-10 0z" fill="#E8A95A" ${K}/><path d="M22 36l4 12M32 32v14M42 36l-4 12" stroke="#A0601E" stroke-width="2.2"/><path d="M14 44c2-2 6-2 6 2M46 46c0-4 4-4 6-2" fill="none" stroke="#fff" stroke-width="2"/>`,
    piernik:`<path d="M32 10c6 0 8 6 6 10 6 0 12 4 10 10l-6 2 4 18c0 6-6 8-8 4l-6-10-6 10c-2 4-8 2-8-4l4-18-6-2c-2-6 4-10 10-10-2-4 0-10 6-10z" fill="#B5743C" ${K}/><path d="M28 16h1M35 16h1M26 34q6 4 12 0" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`,
    kaszuby:`<circle cx="32" cy="40" r="22" fill="#F4F1EA" ${K}/><path d="M32 26c-6 6-6 14 0 18 6-4 6-12 0-18z" fill="#2E7DB5" ${K}/><path d="M20 38c4 6 10 8 12 6M44 38c-4 6-10 8-12 6" fill="#F5B82E" ${K}/><path d="M32 44v10" ${K}/><path d="M24 54c4-4 12-4 16 0" fill="none" stroke="#3E7D3A" stroke-width="2.4"/>`,
    // ludzie w strojach
    lowicki:`<circle cx="32" cy="14" r="7" fill="#F4D0A8" ${K}/><path d="M24 12c2-8 14-8 16 0" fill="#E84A3C" ${K}/><path d="M26 22h12l2 12H24z" fill="#3A2A14" ${K}/><path d="M24 34l-6 28h28l-6-28z" fill="#F5B82E" ${K}/><path d="M22 42h20M21 48h22M20 54h24" stroke="#E84A3C" stroke-width="3"/><path d="M21 45h22M20 51h24" stroke="#2F7A4A" stroke-width="2"/><path d="M19 57h26" stroke="#4FA3D9" stroke-width="2.6"/>`,
    krakowiak:`<circle cx="32" cy="18" r="7" fill="#F4D0A8" ${K}/><path d="M22 12h20l-2-6H24z" fill="#E84A3C" ${K}/><path d="M38 6c4-6 10-6 12-2-4 0-8 2-10 6" fill="#4FA3D9" ${K}/><path d="M24 26h16l2 18H22z" fill="#2E7DB5" ${K}/><path d="M28 28v14M36 28v14" stroke="#F5B82E" stroke-width="2"/><path d="M24 44h16l-2 20h-4l-2-14-2 14h-4z" fill="#F4F1EA" ${K}/>`,
    goral:`<circle cx="32" cy="22" r="7" fill="#F4D0A8" ${K}/><path d="M18 16h28" ${K}/><path d="M22 16c0-8 20-8 20 0" fill="#3A2A14" ${K}/><path d="M22 15h20" stroke="#F4F1EA" stroke-width="2"/><path d="M24 30h16l4 16H20z" fill="#F4F1EA" ${K}/><path d="M28 32l4 6 4-6" fill="none" stroke="#E84A3C" stroke-width="2.2"/><path d="M24 46h16v18h-6V54h-4v10h-6z" fill="#F4F1EA" ${K}/><path d="M26 50l2 4M38 50l-2 4" stroke="#E84A3C" stroke-width="2"/>`,
    opolanka:`<circle cx="32" cy="14" r="7" fill="#F4D0A8" ${K}/><path d="M24 10c4-6 12-6 16 0l-2 4H26z" fill="#F4F1EA" ${K}/><path d="M24 22h16l2 12H22z" fill="#3A2A14" ${K}/><path d="M22 34l-8 28h36l-8-28z" fill="#2E7DB5" ${K}/><path d="M18 50h28" stroke="#F4F1EA" stroke-width="3"/><circle cx="24" cy="44" r="2.4" fill="#E84A3C"/><circle cx="32" cy="42" r="2.4" fill="#F5B82E"/><circle cx="40" cy="44" r="2.4" fill="#E84A3C"/>`
  };
  // motywy krain: [motyw, waga]; "morze" rysuje pas morza z boku krainy
  const KRAINY={
    "zachodniopomorskie":{morze:true,m:[["wydma",3],["sosna",3],["statek",2],["molo",2],["latarnia",1],["krzak",1]]},
    "pomorskie":{morze:true,m:[["wydma",2],["sosna",3],["kaszuby",2],["latarnia",1],["statek",1],["chata",1]]},
    "warmińsko-mazurskie":{m:[["jezioro",3],["zaglowka",3],["chata",2],["sosna",2],["drzewo",2]]},
    "podlaskie":{m:[["zubr",3],["sosna",3],["domek_pod",3],["drzewo",1],["cerkiew",1]]},
    "mazowieckie":{m:[["pkin",2],["syrenka",2],["zamek_krol",2],["kamienice",2],["pole",1],["jablon",2],["sosna",1],["los",1]]},
    "kujawsko-pomorskie":{m:[["piernik",2],["kamienice",2],["pole",2],["drzewo",2],["jezioro",1]]},
    "wielkopolskie":{m:[["koziolki",2],["rogal",2],["zamek",1],["jezioro",2],["sosna",2],["drzewo",1]]},
    "lubuskie":{m:[["sosna",4],["drzewo",2],["zuzel",2],["krzak",1]]},
    "dolnośląskie":{m:[["gory",3],["sosna",2],["kamienice",1],["skytower",1],["rynek",1],["zamek",1],["palac",1]]},
    "opolskie":{m:[["pole",3],["sosna",2],["drzewo",1],["opolanka",2],["dino",2]]},
    "śląskie":{m:[["gory",2],["szyb",2],["spodek",1],["zyrafa",1],["kamienice",1],["sosna",1]]},
    "łódzkie":{m:[["manufaktura",2],["pole",3],["wiatrak",2],["lowicki",2],["drzewo",1]]},
    "świętokrzyskie":{m:[["pole",3],["pole2",2],["sosna",3],["dab",1],["zamek",1],["jaskinia",1]]},
    "lubelskie":{m:[["pole",3],["palac",1],["jablon",3],["ul",2],["chmiel",2]]},
    "podkarpackie":{m:[["polonina",3],["szybowiec",1],["awionetka",1],["jezioro",1],["kosciolek",2],["cerkiew",2],["sosna",1]]},
    "małopolskie":{m:[["giewont",1],["gory",3],["krakowiak",2],["wawel",1],["goral",2],["maczuga",1],["sosna",1]]}
  };
  // ziarno losowania: każda kraina wygląda zawsze tak samo
  function los(z){let s=z>>>0||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
  function deko(woj,W,H,punkty,ziarno){
    const k=KRAINY[woj];if(!k)return "";
    const r=los(ziarno||7),pula=[];k.m.forEach(([m,w])=>{for(let i=0;i<w;i++)pula.push(m);});
    let h='<svg class="deko" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" aria-hidden="true">';
    if(k.morze){
      // pas morza z falami i plażą po lewej
      h+='<path d="M0 0H44c-10 '+(H*.25)+' 10 '+(H*.5)+' 0 '+(H*.75)+'s0 '+(H*.25)+' 6 '+(H*.25)+'H0Z" fill="#6FB6DE" stroke="#3A2A14" stroke-width="2.4"/>';
      h+='<path d="M44 0c-10 '+(H*.25)+' 10 '+(H*.5)+' 0 '+(H*.75)+'s0 '+(H*.25)+' 6 '+(H*.25)+'" fill="none" stroke="#F2D99A" stroke-width="10" opacity=".9"/>';
      for(let y=30;y<H;y+=46)h+='<path d="M6 '+y+'q5-4 10 0t10 0" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>';
    }
    // ścieżka: x w danym y (liniowo między punktami)
    const sorted=punkty.slice().sort((a,b)=>a.y-b.y);
    const xNa=y=>{for(let i=0;i<sorted.length-1;i++){const a=sorted[i],b=sorted[i+1];if(y>=a.y&&y<=b.y)return a.x+(b.x-a.x)*(y-a.y)/(b.y-a.y);}return y<sorted[0].y?sorted[0].x:sorted[sorted.length-1].x;};
    const zajete=[];
    const ile=Math.round(H/44);
    for(let n=0,proby=0;n<ile&&proby<ile*12;proby++){
      const s=.7+r()*.5,w=64*s,y=40+r()*(H-60),x=(k.morze?48:6)+r()*(W-(k.morze?48:6)-w);
      const cx=x+w/2,cy=y-w/2;
      if(Math.abs(cx-xNa(cy))<w/2+26)continue;                     // za blisko ścieżki
      if(punkty.some(p=>Math.hypot(p.x-cx,p.y-cy)<w/2+40))continue;  // za blisko pola poziomu
      if(zajete.some(z=>Math.hypot(z.x-cx,z.y-cy)<(z.w+w)/2*.85))continue;
      zajete.push({x:cx,y:cy,w});n++;
      const m=pula[Math.floor(r()*pula.length)];
      h+='<g transform="translate('+(x).toFixed(1)+' '+(y-64*s).toFixed(1)+') scale('+s.toFixed(2)+')">'+M[m]+'</g>';
    }
    return h+'</svg>';
  }
  return {deko,MOTYWY:M,KRAINY};
})();
