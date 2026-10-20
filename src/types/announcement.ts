/** Объявление из DummyJSON: ресурс posts используется как новости */
export type Announcement = {
  userId: number;
  id: number;
  title: string;
  body: string;
};

/** DummyJSON отдаёт список не массивом, а объектом с массивом posts и данными пагинации */
export type AnnouncementsResponse = {
  posts: Announcement[];
  total: number;
  skip: number;
  limit: number;
};
