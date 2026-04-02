from training_pipeline import parse_args, train_model_by_key


if __name__ == "__main__":
    args = parse_args()
    train_model_by_key(
        "xgboost",
        rows=args.rows,
        test_size=args.test_size,
        random_state=args.random_state,
    )
