const PREFERRED_ACCOUNT_ORDER = [
  "JH信用卡RBC",
  "Ljs信用卡RBC",
  "联合账户RBC (JH)-牛奶金",
  "公司账户RBC (LJS)",
  "LJS Homedepot 信用卡",
  "现金-加币JH",
];

const preferredAccountRank = new Map(
  PREFERRED_ACCOUNT_ORDER.map((name, index) => [name, index]),
);

export function sortAccountsByPreferredOrder<T extends { name?: string | null }>(
  accounts: readonly T[],
): T[] {
  return accounts
    .map((account, index) => ({
      account,
      index,
      rank: account.name ? preferredAccountRank.get(account.name) : undefined,
    }))
    .sort((first, second) => {
      const firstRank = first.rank ?? Number.POSITIVE_INFINITY;
      const secondRank = second.rank ?? Number.POSITIVE_INFINITY;

      if (firstRank !== secondRank) {
        return firstRank - secondRank;
      }

      return first.index - second.index;
    })
    .map(({ account }) => account);
}
