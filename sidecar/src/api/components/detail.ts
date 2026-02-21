import { createWrapperComponent, createSlottedComponent } from '../utils';

const Detail = createSlottedComponent('Detail', ['metadata', 'actions']);

const DetailMetadata = createWrapperComponent('Detail.Metadata');
const DetailMetadataLabel = createWrapperComponent('Detail.Metadata.Label');
const DetailMetadataLink = createWrapperComponent('Detail.Metadata.Link');
const DetailMetadataTagList = createWrapperComponent('Detail.Metadata.TagList');
const DetailMetadataTagListItem = createWrapperComponent('Detail.Metadata.TagList.Item');
const DetailMetadataSeparator = createWrapperComponent('Detail.Metadata.Separator');

Object.assign(Detail, {
	Metadata: DetailMetadata
});
Object.assign(DetailMetadata, {
	Label: DetailMetadataLabel,
	Link: DetailMetadataLink,
	TagList: DetailMetadataTagList,
	Separator: DetailMetadataSeparator
});
Object.assign(DetailMetadataTagList, {
	Item: DetailMetadataTagListItem
});

export { Detail };
