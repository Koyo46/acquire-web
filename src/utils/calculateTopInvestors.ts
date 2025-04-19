export const calculateTopInvestors = (hotelInvestors: any[], hotelName: string) => {
  const investors = hotelInvestors.filter(investor => investor.hotel_name === hotelName);
  const sortedInvestors = investors.sort((a, b) => b.shares - a.shares);
  const topInvestor = sortedInvestors[0] || {};
  const secondInvestor = sortedInvestors[1] || {};
  return { topInvestor, secondInvestor };
};