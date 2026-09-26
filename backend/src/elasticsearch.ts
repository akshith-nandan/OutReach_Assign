import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';
dotenv.config();
const esNode = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';
export const esClient = new Client({
  node: esNode,
});
export const EMAILS_INDEX = 'emails';
export async function initElasticsearch() {
  try {
    const exists = await esClient.indices.exists({ index: EMAILS_INDEX });
    if (!exists) {
      await esClient.indices.create({
        index: EMAILS_INDEX,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            userId: { type: 'keyword' },
            campaignId: { type: 'keyword' },
            senderId: { type: 'keyword' },
            recipientEmail: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            subject: { type: 'text' },
            body: { type: 'text' },
            status: { type: 'keyword' },
            scheduledAt: { type: 'date' },
            sentAt: { type: 'date' },
            createdAt: { type: 'date' },
          },
        },
      });
      console.log(`Elasticsearch index '${EMAILS_INDEX}' created successfully.`);
    } else {
      await esClient.indices.putMapping({
        index: EMAILS_INDEX,
        properties: { userId: { type: 'keyword' } },
      });
      console.log(`Elasticsearch index '${EMAILS_INDEX}' ready.`);
    }
  } catch (error) {
    console.error('Elasticsearch initialization failed:', error);
  }
}
export async function indexEmailJob(emailJob: {
  id: string;
  userId: string;
  campaignId: string;
  senderId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: Date;
  sentAt?: Date | null;
  createdAt?: Date;
}) {
  try {
    await esClient.index({
      index: EMAILS_INDEX,
      id: emailJob.id,
      document: {
        id: emailJob.id,
        userId: emailJob.userId,
        campaignId: emailJob.campaignId,
        senderId: emailJob.senderId,
        recipientEmail: emailJob.recipientEmail,
        subject: emailJob.subject,
        body: emailJob.body,
        status: emailJob.status,
        scheduledAt: emailJob.scheduledAt.toISOString(),
        sentAt: emailJob.sentAt ? emailJob.sentAt.toISOString() : null,
        createdAt: (emailJob.createdAt || new Date()).toISOString(),
      },
    });
  } catch (error) {
    console.error(`Failed to index email job ${emailJob.id} in Elasticsearch:`, error);
  }
}
export async function searchEmails(userId: string, query: string, status?: string) {
  try {
    const mustQueries: any[] = [{ term: { userId } }];
    if (query && query.trim().length > 0) {
      mustQueries.push({
        multi_match: {
          query: query.trim(),
          fields: ['subject^2', 'recipientEmail^3', 'body'],
          fuzziness: 'AUTO',
        },
      });
    }
    if (status && status.trim().length > 0) {
      mustQueries.push({
        term: { status: status.trim() },
      });
    }
    const searchBody = mustQueries.length > 0 ? { bool: { must: mustQueries } } : { match_all: {} };
    const result = await esClient.search({
      index: EMAILS_INDEX,
      query: searchBody,
      size: 100,
      sort: [{ scheduledAt: { order: 'desc' } }],
    });
    return result.hits.hits.map((hit: any) => hit._source);
  } catch (error) {
    console.error('Elasticsearch search error:', error);
    return [];
  }
}
