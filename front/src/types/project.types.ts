export interface AllChattingRoomsResponse {
  status: string;
  data: {
    personalProjectResponses: {
      projectId: number;
      title: string;
      chattingResponses: {
        totalPages: number;
        totalElements: number;
        first: boolean;
        sort: {
          direction: string;
          nullHandling: string;
          ascending: boolean;
          property: string;
          ignoreCase: boolean;
        }[];
        number: number;
        numberOfElements: number;
        pageable: {
          pageNumber: number;
          sort: {
            direction: string;
            nullHandling: string;
            ascending: boolean;
            property: string;
            ignoreCase: boolean;
          }[];
          pageSize: number;
          paged: boolean;
          unpaged: boolean;
          offset: number;
        };
        last: boolean;
        size: number;
        content: {
          projectId: number;
          chattingId: number;
          title: string;
        }[];
      };
    }[];
  };
}

export interface ProjectCreateRequest {
  title: string;
}

export interface ProjectCreateResponse {
  status: string;
  data: {
    projectId: number;
  };
}

export interface ProjectDeleteResponse {
  status: string;
  data: object;
}

export interface ChattingRoomsResponse {
  status: string;
  data: {
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
    size: number;
    content: {
      projectId: number;
      chattingId: number;
      title: string;
    }[];
    number: number;
    sort: {
      direction: string;
      nullHandling: string;
      ascending: boolean;
      property: string;
      ignoreCase: boolean;
    }[];
    numberOfElements: number;
    pageable: {
      offset: number;
      sort: {
        direction: string;
        nullHandling: string;
        ascending: boolean;
        property: string;
        ignoreCase: boolean;
      }[];
      pageSize: number;
      paged: boolean;
      pageNumber: number;
      unpaged: boolean;
    };
    empty: boolean;
  };
}

export interface ProjectDeleteRequest {
  projectId: number;
}

export interface ProjectResponse {
  status: string;
  data: {
    projectId: number;
    title: string;
    chattingResponses: ChattingRoomsResponse;
  };
}

export interface ChattingRoomsResponse {
  projectId: number;
  chattingId: number;
  title: string;
  lastMessage: string;
}
