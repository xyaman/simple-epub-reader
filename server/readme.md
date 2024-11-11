The clients needs to have a copy of the last change (local) and the last 
sincronization timestamp (unix).

## Endpoints API

#### GET /user/generate 

Response Body:
```js
{
    "success": bool,
    "data": string
}
```

#### POST /user/sync 

Request Body:
```js
{
    "user_uuid": string,
    "data": []book,
}
```


Response Body:
```js
// The client books that had been updated in the db
// Note: the books updated in the db are not sent
{
    "success": bool,
    "error": string, // only present if success == false
    "updated_books": []book, // books that should be updated by the client
	"server_updates": []string, // books' titles updates (server side)
}
```
