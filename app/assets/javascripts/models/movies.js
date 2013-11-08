// get value in cookie given the key

function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie != '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) == (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function deleteCookie(name) {
    document.cookie = encodeURIComponent(name) + "=deleted; expires=" + new Date(0).toUTCString();
}

$(document).ready(function() {

    _.templateSettings = {
        interpolate: /\{\{=(.+?)\}\}/g,
        escape: /\{\{-(.+?)\}\}/g,
        evaluate: /\{\{(.+?)\}\}/g,
    };
    
    // At the start, check if user is logged in.
    if (getCookie("access_token") == null || getCookie("access_token") == "") {
        $("#signin").show();
        $("#acksignin").text("").hide();
    } else {
        $.ajax({
            type: "get",
            url: "http://cs3213.herokuapp.com/users/current.json?access_token=" + getCookie("access_token"),
            cache: false,
            error: function(jqXHR, textStatus, error) {
                console.log("Could not get current user data - " + textStatus + ": " + error);
            },
            success: function(data, textStatus, jqXHR) {
                $("#signin").hide();
                $("#acksignin").html(data.email + '<i class="icon-circle-arrow-down"></i>').show();
            }
        });
    }

    // Instantiate all Models
    var Movie = function() {};
    Movie.prototype = new Compass.Model("http://cs3213.herokuapp.com/movies");
    
    var Review = function() {};
    Review.prototype = new Compass.Model("http://cs3213.herokuapp.com/movies/");

    // Instantiate all Collections
    var MoviesCollection = function() {};
    MoviesCollection.prototype = new Compass.Collection(Movie);
    var ReviewsCollection = function() {};
    ReviewsCollection.prototype = new Compass.Collection(Review);

    // Instantiate all Views
    var ListMoviesView = Compass.View.extend({
        template: $("#list-movies-template")
    });
    var SingleMovieView = Compass.View.extend({
        template: $("#single-movie-template")
    });
    var CreateMovieView = Compass.View.extend({
        template: $("#create-movie-template"),
        events: {
            'click #submit': function createMovieEvent() {
                var token = getCookie("access_token");
                if (token == null || token == "") {
                    alert("You need to log in first.");
                    window.location.href = "/";
                } else {
                    var title = $.trim($("#movie_title").val());
                    var summary = $.trim($("#movie_summary").val());
                    var img = $.trim($("#movie_img").val());
                    if (title == "" || summary == "" || img == "") {
                        alert("You must provide a title, summary and an image.");
                    } else {
                        $("#submit").attr('disabled', 'disabled');
                        var newMovie = new Movie;
                        newMovie.set({
                            'access_token': token,
                            'movie[title]': title,
                            'movie[summary]': summary,
                            'movie[img]': document.getElementById('movie_img').files[0]
                        });
                        newMovie.save({
                            success: function(data) {
                                window.location.href = "/";
                            },
                            error: function(error) {
                                console.log(error);
                            }
                        });
                    }
                }
            }
        },
    });
    var UpdateMovieView = Compass.View.extend({
        template: $("#update-movie-template"),
        events: {
            'click #updateMovieBtn': function createMovieEvent(bindedModel) {
                var token = getCookie("access_token");
                if (token == null || token == "") {
                    alert("You need to log in first.");
                } else {
                    var title = $.trim($("#movie_title").val());
                    var summary = $.trim($("#movie_summary").val());
                    if (title == "" || summary == "") {
                        alert("You must provide a title and summary.");
                    } else {
                        $("#updateMovieBtn").attr('disabled', 'disabled');
                        var newData = {
                            'access_token': token,
                            'movie[title]': title,
                            'movie[summary]': summary,
                        };
                        if ($.trim($("#movie_img").val())) {
                            newData['movie[img]'] = document.getElementById('movie_img').files[0];
                        }
                        bindedModel.set(newData);
                        bindedModel.sync({
                            id: bindedModel.obj.id + ".json",
                            success: function() {
                                window.location.href = "#movies/" + bindedModel.obj.id;
                            },
                            error: function(error) {
                                console.log(error);
                                alert(error);
                            }
                        });
                    }
                }
            }
        },
    });

    // Overriding the default render method to provide our custom render method.
    // This is an intended feature of our framework.
    var listMoviesView = new ListMoviesView;
    listMoviesView.render = function(currentPageNumber) {
        var template = _.template(this.template.html(), {
            model: this.model
        });
        $("#movies-div").empty();
        $("#movies-div").append(template);
        if (currentPageNumber == 1) {
            $("#prevLink").hide();
            $("#nextLink").attr("href", "#page/" + 2).show();
        } else {
            var prevNum = currentPageNumber - 1;
            var nextNum = currentPageNumber + 1;
            $("#prevLink").attr("href", "#page/" + prevNum).show()
            $("#nextLink").attr("href", "#page/" + nextNum).show();
        }
        $(".movieImage").click(function() {
            window.location.hash = "#movies/" + $(this).data("movieid");
        });
    };

    // Set up the router.
    var AppRouter = new Compass.Router({
        routes: {
            "": "index",
            "page/:page": "movies_pagination",
            "movies/:id": "view_movie",
            "movie/delete/:id": "delete_movie",
            "movie/update/:id": "update_movie",
            "new_movie": "new_movie",
            "movie/:mid/review/delete/:rid": "delete_review",
            "logout": "logout",
            "review/create/:mid": "create_review"
        },
        handlers: {
            index: function() {
                // load first page of movies
                var listOfMovies = new MoviesCollection;

                listOfMovies.get({
                    customUrl: "http://cs3213.herokuapp.com/movies.json",
                    success: function(data) {
                        listMoviesView.bindModel({
                            model: data
                        });
                        listMoviesView.render(1);
                    },
                    error: function(error) {
                        console.log(error);
                    }
                });
            },
            movies_pagination: function(params) {
                var listOfMovies = new MoviesCollection;

                var page = parseInt(params.page);
                listOfMovies.get({
                    customUrl: "http://cs3213.herokuapp.com/movies.json",
                    additionalParams: {
                        page: page
                    },
                    success: function(data) {
                        listMoviesView.bindModel({
                            model: data
                        });
                        listMoviesView.render(parseInt(page));
                    },
                    error: function(error) {
                        console.log(error);
                    }
                });
            },
            view_movie: function(params) {
                var currentMovie = new Movie;
                var currentMovieView = new SingleMovieView;
                currentMovie.get({
                    id: params.id + ".json",
                    success: function(data) {
                        var listOfReviews = new ReviewsCollection;
                        listOfReviews.get({
                            customUrl: "http://cs3213.herokuapp.com/movies/" + params.id + "/reviews.json",
                            success: function(allReviews) {
                                currentMovie.set({
                                    reviews: allReviews
                                });
                                currentMovieView.bindModel({
                                    model: currentMovie
                                });
                                $("#movies-div").empty();
                                $("#prevLink").hide();
                                $("#nextLink").hide();
                                $("#movies-div").append(currentMovieView.render());
                                $("abbr.timeago").timeago();
                            },
                            error: function(error) {
                                console.log(error);
                            }
                        });
                    },
                    error: function(errorMsg) {
                        console.log(errorMsg);
                    }
                });
            },
            delete_movie: function(params) {
                $("#deleteMovieBtn").attr("disabled", "disabled");
                var movieid = params.id;
                var token = getCookie("access_token");
                if (token == null || token == "") {
                    alert("You need to log in first.");
                    window.location.href = "#movies/" + movieid;
                } else {
                    // we want the user id so that we know whether he is authorized to delete the movie
                    $.ajax({
                        type: "get",
                        url: "http://cs3213.herokuapp.com/users/current.json?access_token=" + token,
                        success: function(data, textStatus, jqXHR) {
                            var uid = data.id;
                            var movieToBeDeleted = new Movie;
                            movieToBeDeleted.get({
                                id: movieid + ".json",
                                success: function(data) {
                                    if (uid != movieToBeDeleted.obj.user.id) {
                                        alert("You are not authorized to delete this movie");
                                        $("#deleteMovieBtn").removeAttr("disabled");
                                    } else {
                                        movieToBeDeleted.set({
                                            'access_token': token
                                        });
                                        movieToBeDeleted.destroy({
                                            id: movieToBeDeleted.obj.id + ".json",
                                            success: function() {
                                                window.location.href = "/";
                                            },
                                            error: function(error) {
                                                console.log("error attempting to delete obj: " + error);
                                                alert("error: ", error);
                                                $("#deleteMovieBtn").removeAttr("disabled");
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    });
                }
            },
            update_movie: function(params) {
                var movieid = params.id;
                var updateMovieView = new UpdateMovieView;
                var movieToBeUpdated = new Movie;
                movieToBeUpdated.get({
                    id: movieid + ".json",
                    success: function(data) {
                        $("#movies-div").empty();
                        $("#prevLink").hide();
                        $("#nextLink").hide();
                        updateMovieView.bindModel({
                            model: movieToBeUpdated
                        });
                        $("#movies-div").append(updateMovieView.render());
                        updateMovieView.delegateEvents();
                    },
                    error: function(errorMsg) {
                        console.log(errorMsg);
                    }
                });
            },
            new_movie: function() {
                var createMovieView = new CreateMovieView;
                $("#movies-div").empty();
                $("#prevLink").hide();
                $("#nextLink").hide();
                $("#movies-div").append(createMovieView.render());
                createMovieView.delegateEvents();
            },
            delete_review: function(params) {
                var movieid = params.mid;
                var reviewid = params.rid;
                var token = getCookie("access_token");
                if (token == null || token == "") {
                    alert("You need to log in first.");
                    window.location.href = "#movies/" + movieid;
                } else {
                    $(".deleteReviewBtn").attr("disabled", "disabled");
                    // There's no API to get a Review Model. hence I can't use our model's destroy() method.
                    // Can only do it this way.
                    $.ajax({
                        type: 'delete',
                        url: 'http://cs3213.herokuapp.com/movies/' + movieid + '/reviews/' + reviewid + '.json',
                        data: {
                            'access_token': token
                        },
                        error: function(jqXHR, textStatus, error) {
                            console.log(textStatus + ": " + error);
                            alert(error);
                            $(".deleteReviewBtn").removeAttr("disabled");
                        },
                        success: function(data, textStatus, jqXHR) {
                            window.location.href = "/#movies/" + movieid;
                        }
                    });
                }
            },
            logout: function() {
                deleteCookie("access_token");
                window.location.href = "/";
            },
            create_review: function(params) {
                var movieid = params.mid;
                var token = getCookie("access_token");
                if (token == null || token == "") {
                    alert("You need to log in first.");
                    return;
                } else {
                    var comment = $.trim($("#review_comment").val());
                    var score = $.trim($("#review_score").val());
                    if (score < 1 || score > 100) {
                        alert("Please enter a score between 1 and 100");
                        window.location.href = "#movies/" + movieid;
                    } else {
                        var data = {
                            'movie_id': movieid,
                            'score': score,
                            'comment': comment,
                            'access_token': token
                        };
                        var url = "http://cs3213.herokuapp.com/movies/" + movieid + "/reviews.json";
                        $.ajax({
                            url: url,
                            type: "POST",
                            dataType: "json",
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            data: JSON.stringify(data),
                            success: function(result) {
                                window.location.href = "#movies/" + movieid;
                            },
                            error: function(xhr, status, err) {
                                console.log(xhr);
                            }
                        });
                    }
                }
            }
        }
    });

    // To start the router, both of the following calls are needed.
    AppRouter._route();
    Compass.History.start();
});