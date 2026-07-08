import type {
	GetPhotoSharesResponse,
	PhotoShareView,
	Unbrand,
} from "@offkai/core";

export type PhotoShare = Unbrand<PhotoShareView>;
export type PhotoSharePage = Unbrand<GetPhotoSharesResponse>;
