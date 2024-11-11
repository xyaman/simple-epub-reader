package models

type EpubBook struct {
	// Database id
	Id int `json:"id"`

	UserUUID  string `json:"user_uuid"`
	UpdatedAt int    `json:"updated_at"`

	// Book's name (epub.title)
	Title    string `json:"title"`
	Creator  string `json:"creator"`
	Language string `json:"language"`

	LastReadIndex int `json:"last_read_index"`

	// Note: This should never be 0 (TODO: use an assert)
	TotalIndex int `json:"total_index"`
}
