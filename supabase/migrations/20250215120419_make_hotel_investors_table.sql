CREATE TABLE hotel_investors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    game_id UUID NOT NULL,
    hotel_name VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL,
    shares INT NOT NULL CHECK (shares >= 0),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_game FOREIGN KEY (game_id) REFERENCES game_tables(id) ON DELETE CASCADE,
    UNIQUE (game_id, hotel_name, user_id)
);
