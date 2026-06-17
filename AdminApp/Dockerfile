FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY AdminApp.csproj ./
RUN dotnet restore
COPY . ./
RUN dotnet publish -c Release -o /app /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
# 한국 표준시(KST) — .ToLocalTime() 표시가 올바르게 동작하도록 tzdata 설치 + TZ 설정
ENV TZ=Asia/Seoul
RUN apt-get update \
    && apt-get install -y --no-install-recommends tzdata \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
    && echo $TZ > /etc/timezone \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /app ./
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080
ENTRYPOINT ["dotnet", "AdminApp.dll"]
