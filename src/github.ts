import axios from 'axios';

const RepositoriesQuery = (owner: string, team: string, next: string | null) => {
  const after: string = next ? `"${next}"`: 'null';

  return `{
  organization(login: "${owner}") {
    team(slug: "${team}") {
      repositories(first: 100, after: ${after}) {
        totalCount
        pageInfo {
          endCursor
          hasNextPage
        }
        edges {
          permission
          node {
            name
            viewerPermission
          }
        }
      }
    }
  }
}`};

const QueryPRs = (owner: string, repo: string) => `
query PRs {
  repository(owner: "${owner}", name: "${repo}") {name pullRequests(first: 20, states: OPEN) {nodes {
		title url createdAt baseRefName headRefOid isDraft number
		repository { name }
		author { login }
		comments(first: 50) {nodes {
      createdAt author { login }
    }}
		reviews(first: 50) {nodes {
      state createdAt author { login }
    }}
    timeline (first: 50) {nodes {
      typename: __typename ... on Commit { oid message status { state } }
    }}
  }}}
}`;

const BatchQueryPRs = (owner: string, repos: string[]) => {
  const batchedRepos = repos.map((repo, index) => {
    const repoFieldAlias = 'alias' +  index;
    return `${repoFieldAlias}:repository(owner: "${owner}", name: "${repo}") {name pullRequests(first: 20, states: OPEN) {nodes {
		title url createdAt baseRefName headRefOid isDraft number
		repository { name }
		author { login }
		comments(first: 50) {nodes {
      createdAt author { login }
    }}
		reviews(first: 50) {nodes {
      state createdAt author { login }
    }}
    timeline (first: 50) {nodes {
      typename: __typename ... on Commit { oid message status { state } }
    }}
}}}`;
  }).join(' ');

  return `query PRs { ${batchedRepos} }`
};

export const batchQueryPRs = (token: string, owner: string, repos: string[]) => {
  return axios({
    url: 'https://api.github.com/graphql',
    method: 'post',
    headers: { Authorization: `Bearer ${token}` },
    data: { query: BatchQueryPRs(owner, repos) }
  });
};

export const queryPRs = (token: string, owner: string, repos: string[]) => repos.map((repo: string) => axios({
	url: 'https://api.github.com/graphql',
	method: 'post',
	headers: { Authorization: `Bearer ${token}` },
	data: { query: QueryPRs(owner, repo) }
}));

const chunks = (array: string[], chunk_size: number) =>
  Array(Math.ceil(array.length / chunk_size))
    .fill(undefined)
    .map((_: any, index: number) => index * chunk_size)
    .map((begin: any) => array.slice(begin, begin + chunk_size));

export const maxConcurrentBatchQueryPRs = (token: string, owner: string, repos: string[]) => {
  const result = chunks(repos, Math.ceil(repos.length / 6));

  return result.map((repos: string[]) => {
    return axios({
      url: 'https://api.github.com/graphql',
      method: 'post',
      headers: { Authorization: `Bearer ${token}` },
      data: { query: BatchQueryPRs(owner, repos) }
    });
  });
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const queryTeamRepos = async (token: string, owner: string, team: string) => {
  let hasNextPage = true;
  let next: string | null = null;
  const repoNames: string[] = [];

  while(hasNextPage) {
    const result: any = await axios({
      url: 'https://api.github.com/graphql',
      method: 'post',
      headers: { Authorization: `Bearer ${token}` },
      data: { query: RepositoriesQuery(owner, team, next) }
    });

    const repositories: any = result.data.data.organization.team.repositories;

    repositories.edges.forEach((repo: any) => {
      if (repo.permission === 'ADMIN') {
        repoNames.push(repo.node.name);
      }
    });
    hasNextPage = repositories.pageInfo.hasNextPage;
    next = repositories.pageInfo.endCursor;

    /* https://developer.github.com/v3/guides/best-practices-for-integrators/#dealing-with-abuse-rate-limits
     * If you're making a large number of POST, PATCH, PUT, or DELETE requests for a single user or client ID,
     * wait at least one second between each request. */
    await sleep(1000);
  }

  return repoNames;
};
