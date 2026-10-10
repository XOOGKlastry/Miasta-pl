-- Podbój Polski: wspólna mapa powiatów. Powiat zdobywa się, grając zestaw 8 pytań o niego.
-- Zasady (pilnuje serwer):
--  * pierwszy powiat dowolny wolny, kolejne tylko graniczące z własnymi,
--  * wolny powiat: co najmniej 5 z 8; cudzy: wynik wyższy niż właściciela; 8 z 8 to twierdza (nie da się przebić),
--  * twierdzę można przejąć pojedynkiem 24 h (te same pytania, obrońca ma dobę) albo kupić, gdy właściciel ją wystawi,
--  * własny powiat można umocnić (lepszy wynik), 10 ataków dziennie (ataki, umocnienia i pojedynki).
-- Niczego nie usuwamy: rekordy prób i pojedynków zostają jako historia.

create table if not exists public.conq_sasiedzi(k text not null, nb text not null, primary key(k, nb));
alter table public.conq_sasiedzi enable row level security;
-- sąsiedztwo z powiaty.topojson (wspólne krawędzie); wpis (k, k) oznacza, że powiat istnieje
insert into public.conq_sasiedzi(k, nb)
  select split_part(e, ':', 1), unnest(string_to_array(split_part(e, ':', 2), ','))
  from unnest(string_to_array('0201:0209,0210,0212,0216,0225,0226,0810;0202:0208,0217,0219,0221,0223,0224;0203:0204,0211,0216,0804,0810,0812;0204:0203,0211,0220,0222,0812,3013,3022;0205:0206,0207,0209,0218,0219,0221,0226;0206:0205,0207,0212,0226,0261;0207:0205,0206,0221;0208:0202,0221,0224;0209:0201,0205,0211,0216,0218,0222,0226,0262;0210:0201,0212,0225;0211:0203,0204,0209,0216,0222;0212:0201,0206,0210,0226;0213:0214,0220,3012,3017,3022;0214:0213,0215,0220,0223,1606,3008,3017,3018;0215:0214,0217,0223,1601,1606;0216:0201,0203,0209,0211,0810;0217:0202,0215,0223,0224,1601,1607;0218:0205,0209,0219,0220,0222,0223,0264;0219:0202,0205,0218,0221,0223,0265;0220:0204,0213,0214,0218,0222,0223,0264,3022;0221:0202,0205,0207,0208,0219,0265;0222:0204,0209,0211,0218,0220;0223:0202,0214,0215,0217,0218,0219,0220,0264;0224:0202,0208,0217,1607;0225:0201,0210,0810,0811;0226:0201,0205,0206,0209,0212;0261:0206;0262:0209;0264:0218,0220,0223;0265:0219,0221;0401:0407,0408,0411,0415,0418;0402:0405,0406,0412,0417,1437,2803,2812;0403:0404,0407,0410,0413,0414,0415,0416,0419,0461;0404:0403,0406,0414,0415,0417;0405:0402,0408,0412,0415,0417;0406:0402,0404,0414,0417,0462,2207,2807,2812;0407:0401,0403,0409,0411,0415,0419,3010;0408:0401,0405,0412,0415,0418,0464,1419,1427;0409:0407,0419,3003,3010,3023;0410:0403,0413,0419,3019,3028;0411:0401,0407,0418,3009,3010;0412:0402,0405,0408,1427,1437;0413:0403,0410,0416,2202,2203,3019,3031;0414:0403,0404,0406,0416,0462,2207,2213,2214;0415:0401,0403,0404,0405,0407,0408,0417,0461,0463;0416:0403,0413,0414,2202,2213;0417:0402,0404,0405,0406,0415;0418:0401,0408,0411,0464,1002,1404,1419,3009;0419:0403,0407,0409,0410,3003,3028;0461:0403,0415;0462:0406,0414;0463:0415;0464:0408,0418;0601:0611,0613,0615,0619,0661,1410,1426,2010;0602:0605,0606,0609,0618,0620,1808,1809,1812,1814;0603:0604,0606,0610,0617,0619,0620,0662;0604:0603,0618,0620;0605:0602,0607,0609,1812,1818;0606:0602,0603,0609,0617,0620;0607:0605,0609,0612,1818,2606,2609;0608:0609,0610,0611,0613,0614,0615,0616;0609:0602,0605,0606,0607,0608,0610,0612,0614,0617,0663;0610:0603,0608,0609,0613,0617,0619;0611:0601,0608,0615,0616,1403,1426;0612:0607,0609,0614,1409,1436,2606;0613:0601,0608,0610,0615,0619;0614:0608,0609,0612,0616,1407,1436;0615:0601,0608,0611,0613;0616:0608,0611,0614,1403,1407;0617:0603,0606,0609,0610,0663;0618:0602,0604,0620,1809;0619:0601,0603,0610,0613;0620:0602,0603,0604,0606,0618,0664;0661:0601;0662:0603;0663:0609,0617;0664:0620;0801:0803,0805,0806,0807,0861,3210;0802:0805,0807,0808,0809,0811;0803:0801,0806,0807,0808,3014,3015;0804:0203,0809,0810,0812,0862,3029;0805:0801,0802,0807;0806:0801,0803,3002,3014,3202,3210,3217;0807:0801,0802,0803,0805,0808;0808:0802,0803,0807,0809,3015;0809:0802,0804,0808,0810,0811,0862,3015,3029;0810:0201,0203,0216,0225,0804,0809,0811;0811:0225,0802,0809,0810;0812:0203,0204,0804,3013,3029;0861:0801;0862:0804,0809;1001:1003,1008,1009,1010,1012,1017;1002:0418,1004,1005,1404,3009;1003:1001,1008,1011,1014,1017,1019;1004:1002,1005,1011,1020,3009;1005:1002,1004,1015,1020,1021,1404,1428;1006:1008,1010,1016,1020,1021,1061;1007:1010,1012,1016,1423,2605;1008:1001,1003,1006,1010,1011,1020,1061;1009:1001,1012,1017,2404,2406;1010:1001,1006,1007,1008,1012,1016,1062;1011:1003,1004,1008,1014,1019,1020,3009,3027;1012:1001,1007,1009,1010,2404,2605,2613;1013:1015,1016,1406,1438;1014:1003,1011,1017,1018,1019,3007,3018,3027;1015:1005,1013,1016,1021,1063,1428,1438;1016:1006,1007,1010,1013,1015,1021,1406,1423;1017:1001,1003,1009,1014,1018,1608,2406;1018:1014,1017,1604,1608,3008,3018;1019:1003,1011,1014;1020:1004,1005,1006,1008,1011,1021,1061;1021:1005,1006,1015,1016,1020;1061:1006,1008,1020;1062:1010;1063:1015;1201:1202,1206,1207,1209,1214,1219;1202:1201,1207,1210,1214,1216;1203:1206,1212,1213,1218,2468;1204:1216,1803,1811,2601,2603,2612;1205:1210,1216,1805;1206:1201,1203,1208,1209,1212,1214,1218,1219,1261;1207:1201,1202,1209,1210,1211;1208:1206,1212,1214,2416,2602,2603,2608;1209:1201,1206,1207,1211,1215,1218,1219;1210:1202,1205,1207,1211,1216,1262;1211:1207,1209,1210,1215,1217;1212:1203,1206,1208,2401,2416,2465,2468;1213:1203,1218,2402,2410,2414,2468;1214:1201,1202,1206,1208,1216,1261,2603;1215:1209,1211,1218,2417;1216:1202,1204,1205,1210,1214,1263,1803,1805,2603;1217:1211;1218:1203,1206,1209,1213,1215,2402,2417;1219:1201,1206,1209,1261;1261:1206,1214,1219;1262:1210;1263:1216;1401:1406,1407,1423,1425;1402:1411,1413,1420,1422,1424;1403:0611,0616,1406,1407,1412,1417,1426;1404:0418,1002,1005,1419,1428;1405:1406,1418,1421,1428,1432,1438;1406:1013,1016,1401,1403,1405,1407,1417,1418,1423,1438;1407:0614,0616,1401,1403,1406,1425,1436;1408:1414,1424,1432,1434,1435,1465;1409:0612,1425,1436,2606,2607,2611;1410:0601,1426,2010;1411:1402,1415,1422,1424,1435;1412:1403,1417,1426,1433,1434,1465;1413:1402,1420,1422,1437,2803,2811;1414:1408,1420,1424,1428,1432;1415:1411,1416,1422,1435,1461,2006,2007,2816,2817;1416:1415,1429,1433,1435,2007,2013,2014;1417:1403,1406,1412,1418,1465;1418:1405,1406,1417,1421,1465;1419:0408,0418,1404,1420,1427,1428,1462;1420:1402,1413,1414,1419,1424,1427,1428,1437;1421:1405,1418,1432,1465;1422:1402,1411,1413,1415,2811,2817;1423:1007,1016,1401,1406,1425,1430,2605;1424:1402,1408,1411,1414,1420,1435;1425:1401,1407,1409,1423,1430,1436,1463,2611;1426:0601,0611,1403,1410,1412,1429,1433,1464,2010;1427:0408,0412,1419,1420,1437;1428:1005,1015,1404,1405,1414,1419,1420,1432,1438;1429:1416,1426,1433,2010,2013;1430:1423,1425,2605,2610,2611;1432:1405,1408,1414,1421,1428,1465;1433:1412,1416,1426,1429,1434,1435;1434:1408,1412,1433,1435,1465;1435:1408,1411,1415,1416,1424,1433,1434;1436:0612,0614,1407,1409,1425;1437:0402,0412,1413,1420,1427,2803;1438:1013,1015,1405,1406,1428;1461:1415;1462:1419;1463:1425;1464:1426;1465:1408,1412,1417,1418,1421,1432,1434;1601:0215,0217,1606,1607,1609;1602:1603,1610,2411;1603:1602,1605,1610,1611,2405,2411;1604:1018,1606,1608,1609,3008;1605:1603,1609,1610,1611;1606:0214,0215,1601,1604,1609,3008;1607:0217,0224,1601,1609,1610;1608:1017,1018,1604,1609,1611,2406,2407;1609:1601,1604,1605,1606,1607,1608,1610,1611,1661;1610:1602,1603,1605,1607,1609;1611:1603,1605,1608,1609,2405,2407,2413;1661:1609;1801:1813,1817,1821;1802:1807,1813,1816,1817,1819;1803:1204,1216,1805,1811,1815,1819;1804:1809,1813,1814;1805:1205,1216,1803,1807,1819;1806:1811,1812,1815,1816,1818,1820;1807:1802,1805,1817,1819,1861;1808:0602,1810,1812,1814,1816;1809:0602,0618,1804,1814;1810:1808,1814,1816;1811:1204,1803,1806,1815,1820,2612;1812:0602,0605,1806,1808,1816,1818;1813:1801,1802,1804,1814,1816,1817,1862;1814:0602,1804,1808,1809,1810,1813,1816;1815:1803,1806,1811,1816,1819;1816:1802,1806,1808,1810,1812,1813,1814,1815,1819,1863;1817:1801,1802,1807,1813,1821;1818:0605,0607,1806,1812,1820,2609;1819:1802,1803,1805,1807,1815,1816;1820:1806,1811,1818,1864,2609,2612;1821:1801,1817;1861:1807;1862:1813;1863:1816;1864:1820,2609;2001:2004,2008,2009,2011,2012,2805;2002:2003,2005,2007,2008,2011,2013,2014,2061;2003:2002,2005,2010,2013;2004:2001,2006,2007,2008,2805,2816;2005:2002,2003,2010;2006:1415,2004,2007,2816;2007:1415,1416,2002,2004,2006,2008,2014,2062;2008:2001,2002,2004,2007,2011;2009:2001,2012;2010:0601,1410,1426,1429,2003,2005,2013;2011:2001,2002,2008;2012:2001,2009,2063,2805,2813,2818;2013:1416,1429,2002,2003,2010,2014;2014:1416,2002,2007,2013;2061:2002;2062:2007;2063:2012;2201:2202,2203,2205,2206,2208,2212,3209,3215;2202:0413,0416,2201,2203,2206,2213;2203:0413,2201,2202,3031,3215;2204:2205,2206,2209,2210,2213,2214,2261;2205:2201,2204,2206,2208,2215,2261,2262;2206:2201,2202,2204,2205,2213;2207:0406,0414,2214,2216,2807;2208:2201,2205,2212,2215;2209:2204,2210,2214,2216,2804;2210:2204,2209,2261,2802,2804;2211:2215,2262;2212:2201,2208,2263,3209,3213;2213:0414,0416,2202,2204,2206,2214;2214:0414,2204,2207,2209,2213,2216;2215:2205,2208,2211,2262;2216:2207,2209,2214,2804,2807,2815;2261:2204,2205,2210,2262,2264;2262:2205,2211,2215,2261,2264;2263:2212;2264:2261,2262;2401:1212,2409,2413,2416,2465,2468,2469,2471,2474,2475;2402:1213,1218,2403,2410,2417,2461;2403:2402,2410,2417,2461,2467;2404:1009,1012,2406,2407,2409,2416,2464,2613;2405:1603,1611,2408,2411,2412,2413,2466,2472,2473,2478;2406:1009,1017,1608,2404,2407,2464;2407:1608,1611,2404,2406,2409,2413;2408:2405,2410,2412,2469,2472,2477,2479;2409:2401,2404,2407,2413,2416;2410:1213,2402,2403,2408,2414,2467,2477,2479;2411:1602,1603,2405,2412,2415,2473;2412:2405,2408,2411,2415,2467,2473,2479;2413:1611,2401,2405,2407,2409,2462,2466,2471,2478;2414:1213,2410,2468,2469,2470,2477;2415:2411,2412,2467,2473;2416:1208,1212,2401,2404,2409,2465,2602,2613;2417:1215,1218,2402,2403;2461:2402,2403;2462:2413,2463,2471,2472,2476,2478;2463:2462,2469,2471,2472,2474,2476;2464:2404,2406;2465:1212,2401,2416,2475;2466:2405,2413,2478;2467:2403,2410,2412,2415,2479;2468:1203,1212,1213,2401,2414,2470,2475;2469:2401,2408,2414,2463,2470,2472,2474,2475,2477;2470:2414,2468,2469,2475;2471:2401,2413,2462,2463,2474;2472:2405,2408,2462,2463,2469,2476,2478;2473:2405,2411,2412,2415,2479;2474:2401,2463,2469,2471;2475:2401,2465,2468,2469,2470;2476:2462,2463,2472;2477:2408,2410,2414,2469;2478:2405,2413,2462,2466,2472;2479:2408,2410,2412,2467,2473;2601:1204,2603,2604,2608,2612;2602:1208,2416,2604,2608,2613;2603:1204,1208,1214,1216,2601,2608;2604:2601,2602,2605,2606,2607,2608,2610,2611,2612,2613,2661;2605:1007,1012,1423,1430,2604,2610,2613;2606:0607,0612,1409,2604,2607,2609,2612;2607:1409,2604,2606,2611;2608:1208,2601,2602,2603,2604;2609:0607,1818,1820,1864,2606,2612;2610:1430,2604,2605,2611;2611:1409,1425,1430,2604,2607,2610;2612:1204,1811,1820,2601,2604,2606,2609;2613:1012,2404,2416,2602,2604,2605;2661:2604;2801:2802,2808,2809,2814;2802:2210,2801,2804,2809;2803:0402,1413,1437,2807,2811,2812,2815;2804:2209,2210,2216,2802,2809,2815,2861;2805:2001,2004,2012,2806,2813,2816;2806:2805,2808,2810,2813,2816,2818,2819;2807:0406,2207,2216,2803,2812,2815;2808:2801,2806,2810,2814,2819;2809:2801,2802,2804,2814,2815;2810:2806,2808,2814,2816,2817;2811:1413,1422,2803,2814,2815,2817;2812:0402,0406,2803,2807;2813:2012,2805,2806,2818;2814:2801,2808,2809,2810,2811,2815,2817,2862;2815:2216,2803,2804,2807,2809,2811,2814;2816:1415,2004,2006,2805,2806,2810,2817;2817:1415,1422,2810,2811,2814,2816;2818:2012,2806,2813,2819;2819:2806,2808,2818;2861:2804;2862:2814;3001:3002,3016,3019,3028;3002:0806,3001,3014,3016,3019,3024,3217;3003:0409,0419,3021,3023,3028,3030;3004:3006,3011,3012,3013,3022,3026;3005:3011,3015,3021,3029;3006:3004,3012,3020,3025,3026,3030;3007:1014,3010,3017,3018,3020,3027,3061;3008:0214,1018,1604,1606,3018;3009:0411,0418,1002,1004,1011,3010,3027;3010:0407,0409,0411,3007,3009,3020,3023,3027,3062;3011:3004,3005,3013,3021,3026,3029;3012:0213,3004,3006,3017,3020,3022;3013:0204,0812,3004,3011,3022,3029,3063;3014:0803,0806,3002,3015,3024;3015:0803,0808,0809,3005,3014,3021,3024,3029;3016:3001,3002,3021,3024,3028;3017:0213,0214,3007,3012,3018,3020,3061;3018:0214,1014,1018,3007,3008,3017;3019:0410,0413,3001,3002,3028,3031,3217;3020:3006,3007,3010,3012,3017,3023,3030,3061;3021:3003,3005,3011,3015,3016,3024,3025,3026,3028,3030,3064;3022:0204,0213,0220,3004,3012,3013;3023:0409,3003,3010,3020,3030;3024:3002,3014,3015,3016,3021;3025:3006,3021,3026,3030;3026:3004,3006,3011,3021,3025;3027:1011,1014,3007,3009,3010;3028:0410,0419,3001,3003,3016,3019,3021;3029:0804,0809,0812,3005,3011,3013,3015;3030:3003,3006,3020,3021,3023,3025;3031:0413,2203,3019,3203,3215,3217;3061:3007,3017,3020;3062:3010;3063:3013;3064:3021;3201:3208,3209,3215,3216;3202:0806,3203,3210,3214,3217;3203:3031,3202,3214,3215,3216,3217,3218;3204:3205,3207,3211,3214,3218,3262,3263;3205:3204,3207,3208,3218;3206:3210,3211,3212,3214,3262;3207:3204,3205,3263;3208:3201,3205,3209,3216,3218;3209:2201,2212,3201,3208,3213,3215,3261;3210:0801,0806,3202,3206,3212,3214;3211:3204,3206,3262,3263;3212:3206,3210,3214;3213:2212,3209;3214:3202,3203,3204,3206,3210,3212,3218,3262;3215:2201,2203,3031,3201,3203,3209,3216;3216:3201,3203,3208,3215,3218;3217:0806,3002,3019,3031,3202,3203;3218:3203,3204,3205,3208,3214,3216;3261:3209;3262:3204,3206,3211,3214;3263:3204,3207,3211', ';')) e
on conflict do nothing;
insert into public.conq_sasiedzi(k, nb) select distinct k, k from public.conq_sasiedzi on conflict do nothing;

create table if not exists public.conq_powiaty(
  k text primary key,
  owner uuid not null,
  score int not null check (score between 0 and 8),
  since timestamptz not null default now(),
  price int check (price is null or price between 5 and 500)
);
alter table public.conq_powiaty enable row level security;

create table if not exists public.conq_proby(
  id uuid primary key default gen_random_uuid(),
  gracz uuid not null,
  k text not null,
  rodzaj text not null check (rodzaj in ('atak','pojedynek','obrona')),
  seed text not null,
  pojedynek uuid,
  started timestamptz not null default clock_timestamp(),
  done boolean not null default false,
  score int
);
create index if not exists conq_proby_gracz on public.conq_proby(gracz, started desc);
alter table public.conq_proby enable row level security;

create table if not exists public.conq_pojedynki(
  id uuid primary key default gen_random_uuid(),
  k text not null,
  challenger uuid not null,
  defender uuid not null,
  seed text not null,
  ch_score int,
  def_score int,
  status text not null default 'start' check (status in ('start','czeka','obronione','zdobyte','anulowany')),
  created timestamptz not null default clock_timestamp(),
  expires timestamptz
);
create index if not exists conq_pojedynki_k on public.conq_pojedynki(k, status);
alter table public.conq_pojedynki enable row level security;

create table if not exists public.conq_portfel(public_id uuid primary key, monety int not null default 0);
alter table public.conq_portfel enable row level security;

create or replace function public._conq_dzis() returns timestamptz language sql stable set search_path = '' as $$
  select (date_trunc('day', now() at time zone 'Europe/Warsaw')) at time zone 'Europe/Warsaw'
$$;
revoke all on function public._conq_dzis() from public, anon, authenticated;

create or replace function public._conq_nick(p uuid) returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select g.nickname from public._gracze() g where g.public_id = p limit 1), 'Gracz')
$$;
revoke all on function public._conq_nick(uuid) from public, anon, authenticated;

-- wiadomość od gry (nadawcą jest drugi gracz, żeby rozmowa trafiła do właściwego wątku)
create or replace function public._conq_wiad(p_od uuid, p_do uuid, p_body text, p_kind text, p_payload jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.player_messages(from_id, to_id, kind, body, payload) values (p_od, p_do, p_kind, left(p_body, 200), p_payload)
$$;
revoke all on function public._conq_wiad(uuid, uuid, text, text, jsonb) from public, anon, authenticated;

-- przejęcie powiatu
create or replace function public._conq_przejmij(p_k text, p_kto uuid, p_score int)
returns void language sql security definer set search_path = '' as $$
  insert into public.conq_powiaty(k, owner, score, since, price) values (p_k, p_kto, p_score, now(), null)
  on conflict (k) do update set owner = excluded.owner, score = excluded.score, since = now(), price = null
$$;
revoke all on function public._conq_przejmij(text, uuid, int) from public, anon, authenticated;

-- rozstrzygnięcie pojedynków, którym minęła doba, i porzuconych w trakcie
create or replace function public._conq_tick()
returns void language plpgsql security definer set search_path = '' as $$
declare d record;
begin
  update public.conq_pojedynki set status = 'anulowany' where status = 'start' and created < now() - interval '30 minutes';
  for d in select * from public.conq_pojedynki where status = 'czeka' and expires < now() for update skip locked loop
    -- obrońca nie zagrał w ciągu doby: powiat przechodzi na atakującego
    if exists(select 1 from public.conq_powiaty p where p.k = d.k and p.owner = d.defender) then
      perform public._conq_przejmij(d.k, d.challenger, d.ch_score);
    end if;
    update public.conq_pojedynki set status = 'zdobyte' where id = d.id;
    perform public._conq_wiad(d.defender, d.challenger, 'Wygrywasz pojedynek walkowerem: obrońca nie zagrał w ciągu doby. Powiat jest Twój!', 'result', jsonb_build_object('podboj', jsonb_build_object('k', d.k)));
  end loop;
end $$;
revoke all on function public._conq_tick() from public, anon, authenticated;

-- mapa dla wszystkich: właściciele, wyniki, ceny, trwające pojedynki
create or replace function public.conq_mapa()
returns table(k text, owner uuid, nick text, score int, price int, pojedynek boolean)
language plpgsql security definer set search_path = '' as $$
begin
  perform public._conq_tick();
  return query select p.k, p.owner, public._conq_nick(p.owner), p.score, p.price,
    exists(select 1 from public.conq_pojedynki d where d.k = p.k and d.status in ('start','czeka'))
  from public.conq_powiaty p;
end $$;
grant execute on function public.conq_mapa() to anon, authenticated;

create or replace function public.conq_ja(p_device uuid, p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token);
begin
  if v_me is null then return null; end if;
  perform public._conq_tick();
  return jsonb_build_object(
    'me', v_me,
    'ataki', (select count(*) from public.conq_proby x where x.gracz = v_me and x.rodzaj in ('atak','pojedynek') and x.started >= public._conq_dzis()),
    'limit', 10,
    'portfel', coalesce((select monety from public.conq_portfel where public_id = v_me), 0),
    'obrony', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'k', d.k, 'nick', public._conq_nick(d.challenger), 'expires', d.expires, 'wynik', d.ch_score) order by d.expires), '[]'::jsonb)
               from public.conq_pojedynki d where d.defender = v_me and d.status = 'czeka'),
    'moje_pojedynki', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'k', d.k, 'nick', public._conq_nick(d.defender), 'expires', d.expires, 'wynik', d.ch_score) order by d.expires), '[]'::jsonb)
               from public.conq_pojedynki d where d.challenger = v_me and d.status = 'czeka'));
end $$;
grant execute on function public.conq_ja(uuid, text) to anon, authenticated;

-- początek próby: serwer sprawdza zasady i wydaje ziarno pytań
create or replace function public.conq_start(p_device uuid, p_token text, p_k text, p_rodzaj text, p_pojedynek uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); p record; v_ile int; v_seed text; v_id uuid; d record; v_duel uuid; v_moj boolean;
begin
  if v_me is null then raise exception 'Najpierw zapisz swój pseudonim w rankingu.'; end if;
  perform public._conq_tick();
  if not exists(select 1 from public.conq_sasiedzi s where s.k = p_k) then raise exception 'Nie ma takiego powiatu'; end if;
  select * into p from public.conq_powiaty x where x.k = p_k;
  if p_rodzaj = 'obrona' then
    select * into d from public.conq_pojedynki x where x.id = p_pojedynek;
    if not found or d.defender <> v_me or d.status <> 'czeka' then raise exception 'Ten pojedynek już się zakończył'; end if;
    insert into public.conq_proby(gracz, k, rodzaj, seed, pojedynek) values (v_me, d.k, 'obrona', d.seed, d.id) returning id into v_id;
    return jsonb_build_object('id', v_id, 'seed', d.seed, 'k', d.k, 'rodzaj', 'obrona', 'cel', d.ch_score, 'rywal', public._conq_nick(d.challenger));
  end if;
  if (select count(*) from public.conq_proby x where x.gracz = v_me and x.rodzaj in ('atak','pojedynek') and x.started >= public._conq_dzis()) >= 10 then
    raise exception 'Wykorzystałeś dziś 10 ataków. Wróć jutro!'; end if;
  if exists(select 1 from public.conq_pojedynki x where x.k = p_k and x.status in ('start','czeka')) then raise exception 'O ten powiat trwa już pojedynek'; end if;
  select count(*) into v_ile from public.conq_powiaty x where x.owner = v_me;
  v_moj := coalesce(p.owner = v_me, false);
  -- własny powiat można umocnić bez sprawdzania granic
  if not v_moj and v_ile > 0 and not exists(
      select 1 from public.conq_sasiedzi s join public.conq_powiaty m on m.k = s.nb and m.owner = v_me where s.k = p_k) then
    raise exception 'Możesz atakować tylko powiaty graniczące z Twoimi'; end if;
  if v_ile = 0 and p.owner is not null then raise exception 'Pierwszy powiat wybierz spośród wolnych'; end if;
  v_seed := encode(extensions.gen_random_bytes(8), 'hex');
  if p_rodzaj = 'pojedynek' then
    if p.owner is null or p.owner = v_me or p.score < 8 then raise exception 'Pojedynek jest tylko o cudzą twierdzę (8 z 8)'; end if;
    insert into public.conq_pojedynki(k, challenger, defender, seed) values (p_k, v_me, p.owner, v_seed) returning id into v_duel;
    insert into public.conq_proby(gracz, k, rodzaj, seed, pojedynek) values (v_me, p_k, 'pojedynek', v_seed, v_duel) returning id into v_id;
    return jsonb_build_object('id', v_id, 'seed', v_seed, 'k', p_k, 'rodzaj', 'pojedynek', 'rywal', public._conq_nick(p.owner));
  end if;
  if p.owner is not null and p.owner <> v_me and p.score >= 8 then raise exception 'To twierdza (8 z 8). Wyzwij właściciela na pojedynek albo kup ją, gdy ją wystawi.'; end if;
  insert into public.conq_proby(gracz, k, rodzaj, seed) values (v_me, p_k, 'atak', v_seed) returning id into v_id;
  return jsonb_build_object('id', v_id, 'seed', v_seed, 'k', p_k, 'rodzaj', 'atak',
    'cel', case when p.owner is null then 5 when p.owner = v_me then p.score + 1 else p.score + 1 end,
    'wlasny', coalesce(p.owner = v_me, false), 'rywal', case when p.owner is null or p.owner = v_me then null else public._conq_nick(p.owner) end);
end $$;
grant execute on function public.conq_start(uuid, text, text, text, uuid) to anon, authenticated;

-- wynik próby (liczba dobrych odpowiedzi 0–8)
create or replace function public.conq_wynik(p_device uuid, p_token text, p_id uuid, p_score int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); a record; p record; d record; v_s int := least(8, greatest(0, coalesce(p_score, 0))); v_wynik text;
begin
  if v_me is null then raise exception 'Najpierw zapisz swój pseudonim w rankingu.'; end if;
  select * into a from public.conq_proby x where x.id = p_id for update;
  if not found or a.gracz <> v_me then raise exception 'Nie ma takiej próby'; end if;
  if a.done then return jsonb_build_object('wynik', 'juz', 'score', a.score); end if;
  if a.started < clock_timestamp() - interval '20 minutes' then
    update public.conq_proby set done = true, score = 0 where id = p_id;
    return jsonb_build_object('wynik', 'czas');
  end if;
  update public.conq_proby set done = true, score = v_s where id = p_id;
  select * into p from public.conq_powiaty x where x.k = a.k for update;
  if a.rodzaj = 'atak' then
    if not found then
      if v_s >= 5 then perform public._conq_przejmij(a.k, v_me, v_s); v_wynik := 'zdobyty'; else v_wynik := 'za_malo'; end if;
    elsif p.owner = v_me then
      if v_s > p.score then update public.conq_powiaty set score = v_s where k = a.k; v_wynik := 'umocniony'; else v_wynik := 'bez_zmian'; end if;
    elsif p.score < 8 and v_s > p.score then
      perform public._conq_przejmij(a.k, v_me, v_s); v_wynik := 'przejety';
      perform public._conq_wiad(v_me, p.owner, public._conq_nick(v_me) || ' przejął Twój powiat (' || v_s || ' : ' || p.score || '). Odbij go na mapie Podboju!', 'result', jsonb_build_object('podboj', jsonb_build_object('k', a.k)));
    else v_wynik := 'za_malo';
    end if;
    return jsonb_build_object('wynik', v_wynik, 'score', v_s, 'k', a.k);
  end if;
  select * into d from public.conq_pojedynki x where x.id = a.pojedynek for update;
  if a.rodzaj = 'pojedynek' then
    if d.status <> 'start' then return jsonb_build_object('wynik', 'anulowany'); end if;
    update public.conq_pojedynki set ch_score = v_s, status = 'czeka', expires = now() + interval '24 hours' where id = d.id;
    perform public._conq_wiad(v_me, d.defender, public._conq_nick(v_me) || ' wyzywa Cię na pojedynek o Twoją twierdzę (' || v_s || ' z 8). Masz 24 godziny na obronę na mapie Podboju.', 'challenge', jsonb_build_object('podboj', jsonb_build_object('k', d.k, 'pojedynek', d.id)));
    return jsonb_build_object('wynik', 'wyzwanie', 'score', v_s, 'k', d.k);
  end if;
  -- obrona
  if d.status <> 'czeka' then return jsonb_build_object('wynik', 'po_czasie'); end if;
  update public.conq_pojedynki set def_score = v_s, status = case when v_s >= d.ch_score then 'obronione' else 'zdobyte' end where id = d.id;
  if v_s >= d.ch_score then
    perform public._conq_wiad(v_me, d.challenger, public._conq_nick(v_me) || ' obronił twierdzę (' || v_s || ' : ' || d.ch_score || ').', 'result', jsonb_build_object('podboj', jsonb_build_object('k', d.k)));
    return jsonb_build_object('wynik', 'obronione', 'score', v_s, 'k', d.k, 'rywal_wynik', d.ch_score);
  end if;
  perform public._conq_przejmij(d.k, d.challenger, d.ch_score);
  perform public._conq_wiad(v_me, d.challenger, 'Wygrywasz pojedynek (' || d.ch_score || ' : ' || v_s || ')! Twierdza jest Twoja.', 'result', jsonb_build_object('podboj', jsonb_build_object('k', d.k)));
  return jsonb_build_object('wynik', 'stracony', 'score', v_s, 'k', d.k, 'rywal_wynik', d.ch_score);
end $$;
grant execute on function public.conq_wynik(uuid, text, uuid, int) to anon, authenticated;

-- wystawienie powiatu na sprzedaż (cena w monetach) albo zdjęcie oferty (null)
create or replace function public.conq_sprzedaz(p_device uuid, p_token text, p_k text, p_cena int)
returns void language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token);
begin
  if v_me is null then raise exception 'Najpierw zapisz swój pseudonim w rankingu.'; end if;
  if p_cena is not null and (p_cena < 5 or p_cena > 500) then raise exception 'Cena od 5 do 500 monet'; end if;
  update public.conq_powiaty set price = p_cena where k = p_k and owner = v_me;
  if not found then raise exception 'To nie jest Twój powiat'; end if;
end $$;
grant execute on function public.conq_sprzedaz(uuid, text, text, int) to anon, authenticated;

-- zakup: monety pobiera telefon kupującego, sprzedający odbiera je z portfela
create or replace function public.conq_kup(p_device uuid, p_token text, p_k text, p_cena int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); p record; v_ile int;
begin
  if v_me is null then raise exception 'Najpierw zapisz swój pseudonim w rankingu.'; end if;
  select * into p from public.conq_powiaty x where x.k = p_k for update;
  if not found or p.price is null then raise exception 'Ten powiat nie jest na sprzedaż'; end if;
  if p.owner = v_me then raise exception 'To już Twój powiat'; end if;
  if p.price <> p_cena then raise exception 'Cena się zmieniła, odśwież mapę'; end if;
  if exists(select 1 from public.conq_pojedynki x where x.k = p_k and x.status in ('start','czeka')) then raise exception 'O ten powiat trwa pojedynek'; end if;
  select count(*) into v_ile from public.conq_powiaty x where x.owner = v_me;
  if v_ile > 0 and not exists(select 1 from public.conq_sasiedzi s join public.conq_powiaty m on m.k = s.nb and m.owner = v_me where s.k = p_k) then
    raise exception 'Kupić możesz tylko powiat graniczący z Twoimi'; end if;
  insert into public.conq_portfel(public_id, monety) values (p.owner, p.price) on conflict (public_id) do update set monety = public.conq_portfel.monety + excluded.monety;
  perform public._conq_przejmij(p_k, v_me, p.score);
  perform public._conq_wiad(v_me, p.owner, public._conq_nick(v_me) || ' kupił Twój powiat za ' || p.price || ' monet. Odbierz je na mapie Podboju.', 'result', jsonb_build_object('podboj', jsonb_build_object('k', p_k)));
  return jsonb_build_object('k', p_k, 'score', p.score, 'cena', p.price);
end $$;
grant execute on function public.conq_kup(uuid, text, text, int) to anon, authenticated;

create or replace function public.conq_odbierz(p_device uuid, p_token text)
returns int language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); v int;
begin
  if v_me is null then return 0; end if;
  select monety into v from public.conq_portfel where public_id = v_me for update;
  if coalesce(v, 0) > 0 then update public.conq_portfel set monety = 0 where public_id = v_me; end if;
  return coalesce(v, 0);
end $$;
grant execute on function public.conq_odbierz(uuid, text) to anon, authenticated;

create or replace function public.conq_ranking()
returns table(place bigint, nickname text, public_id uuid, powiaty bigint, twierdze bigint, punkty bigint)
language sql stable security definer set search_path = '' as $$
  select rank() over(order by count(*) desc, sum(p.score) desc), public._conq_nick(p.owner), p.owner, count(*), count(*) filter (where p.score >= 8), sum(p.score)
  from public.conq_powiaty p group by p.owner order by 4 desc, 6 desc limit 50
$$;
grant execute on function public.conq_ranking() to anon, authenticated;
