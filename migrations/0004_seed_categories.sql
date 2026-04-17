-- Seed categories based on provided IDs/names
-- Run this in Supabase SQL editor or via migrations

INSERT INTO categories (id, name)
VALUES
  ('6af9d5b7-694d-41be-97e4-ba0f124f8292', 'Antiques'),
  ('9ef27d07-7f23-41eb-9525-62ca89735294', 'Art'),
  ('63e4d7a3-b1d9-4697-8153-533faa79b23b', 'Baby'),
  ('df4587c4-7502-48c6-ac28-26cb414e45cb', 'Books'),
  ('25af15db-4455-4f62-892c-37684e4735f2', 'Business & Industrial'),
  ('43df8bd1-3f01-4b61-ac28-8fbcbd0ded51', 'Cameras & Photo'),
  ('57491677-3c6c-4ec0-8777-cd1a79df93c2', 'Cell Phones & Accessories'),
  ('d088b3db-04f2-4fa5-b3a2-71e6746eabc6', 'Clothing, Shoes & Accessories'),
  ('7e085387-ea45-4f04-bab5-2bda616b21b0', 'Coins & Paper Money'),
  ('90fbef21-d620-4869-829d-212a9e4d325e', 'Collectibles'),
  ('2236e1c1-4b0e-45ec-b0df-af444abe717d', 'Computers/Tablets & Networking'),
  ('fb180fbe-988e-4e83-81a8-cc11f4fc77e9', 'Consumer Electronics'),
  ('42d12ce5-c658-4bbf-9e37-1f8822d9d639', 'Crafts'),
  ('f9455ca7-d7d8-4b19-9f20-fb836658dc9e', 'Entertainment & Memorabilia'),
  ('df3bd6a9-d62c-4616-89ff-674a67ebd1c7', 'Everything Else'),
  ('6786be7d-a971-402c-8a0b-749f0e175cbb', 'Gift Cards & Coupons'),
  ('dde7be5f-53a0-45e3-956e-a0960b2a835e', 'Health & Beauty'),
  ('8a53f0de-2523-45af-8de2-4c511454f29b', 'Home & Garden'),
  ('b620edff-0276-4e97-b59c-5710daec1514', 'Motors'),
  ('8b5cfc29-166b-4915-981d-d0e24e951ab3', 'Movies & TV'),
  ('f452895c-9370-4580-8c35-c8e3aed807d3', 'Music'),
  ('5ec42275-9e84-405c-9bd7-46e3aa0f5c24', 'Musical Instruments & Gear'),
  ('5ff616a3-b060-4901-b68b-c5804c30103b', 'Pet Supplies'),
  ('f502df4f-9865-42b2-bacf-25222797f596', 'Pottery & Glass'),
  ('a049c6a0-ee91-40bc-ba6f-5f1960621a5a', 'Real Estate'),
  ('b9c113e5-b1bc-474e-9d4b-57080c850ae6', 'Specialty Services'),
  ('7c8eac1e-e15a-40f5-aee1-b55823ab9028', 'Sporting Goods'),
  ('aa57339f-c379-40ca-87d5-351d9987a287', 'Sports Mem, Cards & Fan Shop'),
  ('c7b3bd2b-fe0c-4d71-9d0e-9331ee9b2c26', 'Stamps'),
  ('9dda610a-9975-4061-9d91-e7290fc0c0f8', 'Tickets & Experiences'),
  ('bebf165c-ec48-494d-ba8e-8711aa23ffe2', 'Video Games & Consoles'),
  ('a9b99972-87d9-4e13-98fc-fcc88e3292ca', 'Travel'),
  ('cce909ee-ee68-4b95-b421-9e8ac486d00e', 'Toys & Hobbies')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
