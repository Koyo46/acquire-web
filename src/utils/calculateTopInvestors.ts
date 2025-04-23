interface HotelInvestor {
  hotel_name: string;
  user_id: string;
  users?: {
    username: string;
  };
  shares: number;
}

export const calculateTopInvestors = (hotelInvestors: HotelInvestor[], hotelName: string) => {
  const investors = hotelInvestors.filter(investor => investor.hotel_name === hotelName);
  const sortedInvestors = investors.sort((a, b) => b.shares - a.shares);
  const topInvestor = sortedInvestors[0] || { user_id: "", shares: 0, hotel_name: "" };
  const secondInvestor = sortedInvestors[1] || { user_id: "", shares: 0, hotel_name: "" };
  return { topInvestor, secondInvestor };
};