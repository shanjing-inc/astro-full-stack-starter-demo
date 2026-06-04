export const SentryGroup = {
    DINGDANXIA_REQUEST: "dingdanxia-request",
    GOODS_NO_REBATE: "goods-no-rebate",
    HAODANKU_REQUEST: "haodanku-request",
    JD_CONVERT: "jd-convert",
    JUTUIKE_REQUEST: "jutuike-request",
    TAOBAO_CONVERT: "taobao-convert",
    TAOBAO_SEARCH: "taobao-search",
} as const;

export type SentryGroupName = (typeof SentryGroup)[keyof typeof SentryGroup];
