//user react query to get the data

const BASE_URL = import.meta.env.VITE_AUTOCOMPLETE_URL;

//post request to get the data with query: "title" as data
// export const getBDRCAutosuggest = async (query: string) => {
//   const response = await axios.post(BASE_URL, { query });
//   return response.data;
// };
//use fetch
export const getBDRCAutosuggest = async (query: string) => {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  return await response.json();
};
