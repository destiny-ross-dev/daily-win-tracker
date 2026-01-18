export type QuoteForm = {
  policyholder: string;
  lob: "auto" | "fire" | "life" | "health";
  policy_type: string;
  zipcode: string;
  callback_datetime: string;
  quoted_date: string;
  quoted_premium: string;
  written_date: string;
  written_premium: string;
  issued_date: string;
  issued_premium: string;
};

export type CallbackForm = {
  policyholder: string;
  datetime: string;
};

export type ActivityFeedItem = {
  id: string;
  type: "quote" | "sale" | "appointment";
  title: string;
  detail: string;
  userName: string;
  timestamp: string;
};
