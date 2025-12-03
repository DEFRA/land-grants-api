DELETE FROM
public.agreements
WHERE parcel_id = '7269' and sheet_id = 'SD6747';

DELETE FROM
land_parcels
WHERE parcel_id = '7269';

DELETE FROM
land_covers
WHERE parcel_id = '7269';
